import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Cake,
  TrendingUp,
  DollarSign,
  Scissors,
  Gift,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import {
  fetchCitas,
  fetchProductosCafeteria,
  fetchInsumos,
  fetchClientes,
  fetchMovimientosCajaPorRango,
  type CitaDB,
  type ProductoCafeteriaDB,
  type InsumoDB,
  type ClienteDB,
} from "../../lib/adminApi";

type PeriodoVentas = "hoy" | "semana" | "mes" | "todo";
type VentanaCumple = 2 | 7;

function formatoFechaLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inicioDeSemana(d: Date) {
  const copia = new Date(d);
  const dia = copia.getDay(); // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1; // lunes como inicio de semana
  copia.setDate(copia.getDate() - diff);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

export function DashboardTab() {
  const { mostrarError } = useToast();

  const [citas, setCitas] = useState<CitaDB[]>([]);
  const [productos, setProductos] = useState<ProductoCafeteriaDB[]>([]);
  const [insumos, setInsumos] = useState<InsumoDB[]>([]);
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  const [periodoVentas, setPeriodoVentas] = useState<PeriodoVentas>("semana");
  const [ventanaCumple, setVentanaCumple] = useState<VentanaCumple>(7);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const hoy = formatoFechaLocal(new Date());
      const [c, p, i, cl, mov] = await Promise.all([
        fetchCitas(),
        fetchProductosCafeteria(),
        fetchInsumos(),
        fetchClientes(),
        fetchMovimientosCajaPorRango(hoy, hoy).catch(() => []),
      ]);
      setCitas(c);
      setProductos(p);
      setInsumos(i);
      setClientes(cl);
      const neto = mov.reduce((acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
      setIngresosHoy(neto);
    } catch {
      mostrarError("No se pudo cargar el dashboard.");
    } finally {
      setCargando(false);
    }
  }, [mostrarError]);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "productos_cafeteria" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "insumos" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "caja_movimientos" }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  // ---------- KPIs ----------
  const hoyStr = formatoFechaLocal(new Date());
  const citasHoy = citas.filter((c) => c.fecha === hoyStr && c.estado !== "cancelada");

  const reservasPendientes = useMemo(
    () =>
      citas
        .filter((c) => c.estado === "pendiente")
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
    [citas]
  );

  const alertasCafeteria = productos.filter((p) => p.activo && p.stock_actual <= p.stock_minimo);
  const alertasInsumos = insumos.filter((i) => i.activo && i.stock_actual <= i.stock_minimo);
  const totalAlertasStock = alertasCafeteria.length + alertasInsumos.length;

  // ---------- Servicios más vendidos ----------
  const rangoVentas = useMemo(() => {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    if (periodoVentas === "hoy") return { desde: new Date(ahora), hasta: new Date(ahora) };
    if (periodoVentas === "semana") {
      const desde = inicioDeSemana(ahora);
      return { desde, hasta: ahora };
    }
    if (periodoVentas === "mes") {
      const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      return { desde, hasta: ahora };
    }
    return { desde: null as Date | null, hasta: null as Date | null }; // todo
  }, [periodoVentas]);

  const rankingServicios = useMemo(() => {
    const desdeStr = rangoVentas.desde ? formatoFechaLocal(rangoVentas.desde) : null;
    const hastaStr = rangoVentas.hasta ? formatoFechaLocal(rangoVentas.hasta) : null;

    const filtradas = citas.filter((c) => {
      if (c.estado === "cancelada") return false;
      if (desdeStr && c.fecha < desdeStr) return false;
      if (hastaStr && c.fecha > hastaStr) return false;
      return true;
    });

    const conteo = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
    for (const c of filtradas) {
      if (!c.servicio_id) continue;
      const nombre = c.servicios?.nombre ?? "Servicio eliminado";
      const precio = c.servicios?.precio ?? 0;
      const actual = conteo.get(c.servicio_id) ?? { nombre, cantidad: 0, ingresos: 0 };
      actual.cantidad += 1;
      actual.ingresos += precio;
      conteo.set(c.servicio_id, actual);
    }

    return Array.from(conteo.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [citas, rangoVentas]);

  const maxCantidad = rankingServicios[0]?.cantidad ?? 0;

  // ---------- Cumpleaños próximos ----------
  const proximosCumples = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return clientes
      .filter((c) => !!c.fecha_nacimiento)
      .map((c) => {
        const nacimiento = new Date(c.fecha_nacimiento! + "T00:00:00");
        let proximo = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        if (proximo < hoy) {
          proximo = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate());
        }
        const diffDias = Math.round((proximo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        const edadCumplira = proximo.getFullYear() - nacimiento.getFullYear();
        return { cliente: c, diffDias, edadCumplira };
      })
      .filter((x) => x.diffDias >= 0 && x.diffDias <= ventanaCumple)
      .sort((a, b) => a.diffDias - b.diffDias);
  }, [clientes, ventanaCumple]);

  if (cargando) {
    return <p className="font-body text-sm text-criss">Cargando dashboard...</p>;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-blanco">Dashboard</h2>
      </div>
      <p className="mb-5 font-body text-xs text-criss">Resumen general del negocio en tiempo real.</p>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-1 flex items-center gap-1.5 text-criss">
            <CalendarClock size={13} />
            <p className="font-body text-[11px] uppercase">Citas hoy</p>
          </div>
          <p className="font-display text-xl text-blanco">{citasHoy.length}</p>
        </div>
        <div className="rounded-xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-1 flex items-center gap-1.5 text-criss">
            <Clock size={13} />
            <p className="font-body text-[11px] uppercase">Pendientes</p>
          </div>
          <p className="font-display text-xl text-blanco">{reservasPendientes.length}</p>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            totalAlertasStock > 0 ? "border-amarillo/30 bg-amarillo/5" : "border-carbon-2 bg-carbon"
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5 text-criss">
            <AlertTriangle size={13} />
            <p className="font-body text-[11px] uppercase">Stock bajo</p>
          </div>
          <p className={`font-display text-xl ${totalAlertasStock > 0 ? "text-amarillo" : "text-blanco"}`}>
            {totalAlertasStock}
          </p>
        </div>
        <div className="rounded-xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-1 flex items-center gap-1.5 text-criss">
            <DollarSign size={13} />
            <p className="font-body text-[11px] uppercase">Ingresos hoy</p>
          </div>
          <p className="font-display text-xl text-blanco">
            {ingresosHoy === null ? "—" : `S/ ${ingresosHoy.toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Reservas pendientes */}
        <section className="rounded-2xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock size={16} className="text-blanco" />
            <h3 className="font-display text-sm text-blanco">Reservas pendientes</h3>
            <span className="ml-auto rounded-full bg-negro px-2 py-0.5 font-body text-[11px] text-criss">
              {reservasPendientes.length}
            </span>
          </div>
          {reservasPendientes.length === 0 ? (
            <p className="py-6 text-center font-body text-xs text-criss">No hay reservas pendientes.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {reservasPendientes.map((c) => (
                <div key={c.id} className="rounded-xl border border-carbon-2 bg-negro p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-body text-sm font-semibold text-blanco">{c.cliente_nombre}</p>
                    <span className="font-body text-[11px] text-criss">
                      {c.fecha} · {c.hora.slice(0, 5)}
                    </span>
                  </div>
                  <p className="font-body text-xs text-criss">
                    {c.servicios?.nombre ?? "—"}
                    {c.barberos?.nombre ? ` · ${c.barberos.nombre}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Stock bajo */}
        <section className="rounded-2xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amarillo" />
            <h3 className="font-display text-sm text-blanco">Stock bajo</h3>
            <span className="ml-auto rounded-full bg-negro px-2 py-0.5 font-body text-[11px] text-criss">
              {totalAlertasStock}
            </span>
          </div>
          {totalAlertasStock === 0 ? (
            <p className="py-6 text-center font-body text-xs text-criss">Todo el stock está en buen nivel.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {alertasCafeteria.map((p) => (
                <div
                  key={`caf-${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-amarillo/30 bg-negro p-3"
                >
                  <div>
                    <p className="font-body text-sm text-blanco">{p.nombre}</p>
                    <p className="font-body text-[11px] text-criss">Cafetería · mínimo {p.stock_minimo}</p>
                  </div>
                  <span className="font-display text-sm text-amarillo">{p.stock_actual}</span>
                </div>
              ))}
              {alertasInsumos.map((i) => (
                <div
                  key={`ins-${i.id}`}
                  className="flex items-center justify-between rounded-xl border border-amarillo/30 bg-negro p-3"
                >
                  <div>
                    <p className="font-body text-sm text-blanco">{i.nombre}</p>
                    <p className="font-body text-[11px] text-criss">
                      Insumo · mínimo {i.stock_minimo} {i.unidad}
                    </p>
                  </div>
                  <span className="font-display text-sm text-amarillo">
                    {i.stock_actual} {i.unidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Servicios más vendidos */}
        <section className="rounded-2xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blanco" />
              <h3 className="font-display text-sm text-blanco">Servicios más vendidos</h3>
            </div>
            <select
              value={periodoVentas}
              onChange={(e) => setPeriodoVentas(e.target.value as PeriodoVentas)}
              className="rounded-lg border border-carbon-2 bg-negro px-2 py-1 font-body text-xs text-blanco outline-none focus:border-amarillo"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="todo">Todo</option>
            </select>
          </div>
          {rankingServicios.length === 0 ? (
            <p className="py-6 text-center font-body text-xs text-criss">No hay ventas en este período.</p>
          ) : (
            <div className="space-y-3">
              {rankingServicios.slice(0, 5).map((s, idx) => (
                <div key={s.nombre + idx}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Scissors size={12} className="text-criss" />
                      <p className="font-body text-xs text-blanco">{s.nombre}</p>
                      {idx === 0 && (
                        <span className="rounded-full bg-amarillo px-2 py-0.5 font-body text-[10px] font-semibold text-negro">
                          Top
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-criss">
                      {s.cantidad} · S/ {s.ingresos.toFixed(2)}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-negro">
                    <div
                      className="h-full rounded-full bg-amarillo"
                      style={{ width: `${maxCantidad > 0 ? (s.cantidad / maxCantidad) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cumpleaños próximos */}
        <section className="rounded-2xl border border-carbon-2 bg-carbon p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cake size={16} className="text-blanco" />
              <h3 className="font-display text-sm text-blanco">Cumpleaños próximos</h3>
            </div>
            <select
              value={ventanaCumple}
              onChange={(e) => setVentanaCumple(Number(e.target.value) as VentanaCumple)}
              className="rounded-lg border border-carbon-2 bg-negro px-2 py-1 font-body text-xs text-blanco outline-none focus:border-amarillo"
            >
              <option value={2}>2 días</option>
              <option value={7}>1 semana</option>
            </select>
          </div>
          {proximosCumples.length === 0 ? (
            <p className="py-6 text-center font-body text-xs text-criss">No hay cumpleaños en este rango.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {proximosCumples.map(({ cliente, diffDias, edadCumplira }) => (
                <div
                  key={cliente.id}
                  className="flex items-center justify-between rounded-xl border border-carbon-2 bg-negro p-3"
                >
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-amarillo" />
                    <div>
                      <p className="font-body text-sm text-blanco">
                        {cliente.nombre} {cliente.apellido}
                      </p>
                      <p className="font-body text-[11px] text-criss">
                        Cumple {edadCumplira} años{cliente.celular ? ` · ${cliente.celular}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-body text-[11px] font-semibold text-amarillo">
                    {diffDias === 0 ? "Hoy" : diffDias === 1 ? "Mañana" : `En ${diffDias} días`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}