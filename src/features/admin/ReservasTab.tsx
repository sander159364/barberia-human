import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  Phone,
  User,
  RefreshCw,
  DollarSign,
  Scissors,
  Search,
  X,
  SlidersHorizontal,
  Users as UsersIcon,
  Wallet,
  CalendarClock,
  CalendarX,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/Toast";
import {
  fetchCitas,
  actualizarEstadoCita,
  registrarPagoReserva,
  fetchBarberos,
  type CitaDB,
  type BarberoDB,
} from "../../lib/adminApi";

const ESTADOS = ["pendiente", "confirmada", "completada", "cancelada"] as const;
type Estado = (typeof ESTADOS)[number] | "todas";
type MetodoPago = "efectivo" | "yape";

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  confirmada: "bg-sky-400/15 text-sky-400 border-sky-400/30",
  completada: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  cancelada: "bg-carbon-2 text-criss border-carbon-2",
};

const ESTADO_BORDE: Record<string, string> = {
  pendiente: "border-l-amber-400",
  confirmada: "border-l-sky-400",
  completada: "border-l-emerald-400",
  cancelada: "border-l-carbon-2",
};

const ESTADO_PUNTO: Record<string, string> = {
  pendiente: "bg-amber-400",
  confirmada: "bg-sky-400",
  completada: "bg-emerald-400",
  cancelada: "bg-neutral-500",
};

function formatearFechaCorta(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function ReservasTab() {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();

  const [citas, setCitas] = useState<CitaDB[]>([]);
  const [barberos, setBarberos] = useState<BarberoDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);

  // ---------- Filtros ----------
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>("todas");
  const [barberoId, setBarberoId] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // ---------- Modales ----------
  const [modalCobro, setModalCobro] = useState<CitaDB | null>(null);
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>("efectivo");
  const [procesandoCobro, setProcesandoCobro] = useState(false);

  const [cambioPendiente, setCambioPendiente] = useState<{ cita: CitaDB; nuevoEstado: string } | null>(null);
  const [procesandoCambio, setProcesandoCambio] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    else setActualizando(true);
    try {
      setCitas(await fetchCitas());
      setError(null);
    } catch {
      setError("No se pudieron cargar las reservas.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    fetchBarberos().then(setBarberos).catch(() => {});

    const canal = supabase
      .channel("admin-reservas")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => cargar(true))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  function pedirCambioEstado(cita: CitaDB, nuevoEstado: string) {
    if (nuevoEstado === cita.estado) return;
    setCambioPendiente({ cita, nuevoEstado });
  }

  async function confirmarCambioEstado() {
    if (!usuario || !cambioPendiente) return;
    const { cita, nuevoEstado } = cambioPendiente;
    setProcesandoCambio(true);
    try {
      await actualizarEstadoCita(usuario.token, cita.id, nuevoEstado);
      setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estado: nuevoEstado as CitaDB["estado"] } : c)));
      mostrarExito(`Reserva de ${cita.cliente_nombre} marcada como ${nuevoEstado}.`);
      setCambioPendiente(null);
    } catch {
      mostrarError("No se pudo actualizar el estado. Intenta de nuevo.");
    } finally {
      setProcesandoCambio(false);
    }
  }

  async function handleCobro() {
    if (!usuario || !modalCobro) return;
    setProcesandoCobro(true);
    try {
      await registrarPagoReserva(usuario.token, modalCobro.id, metodoCobro);
      mostrarExito(`Cobro de ${modalCobro.cliente_nombre} registrado (${metodoCobro}).`);
      setModalCobro(null);
      cargar();
    } catch {
      mostrarError("No se pudo registrar el cobro. Verifica que la caja esté abierta.");
    } finally {
      setProcesandoCobro(false);
    }
  }

  // ---------- Filtrado ----------
  const citasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return citas.filter((c) => {
      if (estado !== "todas" && c.estado !== estado) return false;
      if (barberoId !== "todos" && c.barbero_id !== barberoId) return false;
      if (fechaDesde && c.fecha < fechaDesde) return false;
      if (fechaHasta && c.fecha > fechaHasta) return false;
      if (q) {
        const enNombre = c.cliente_nombre.toLowerCase().includes(q);
        const enTelefono = c.cliente_telefono.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
        if (!enNombre && !enTelefono) return false;
      }
      return true;
    });
  }, [citas, busqueda, estado, barberoId, fechaDesde, fechaHasta]);

  const hayFiltrosActivos =
    busqueda.trim() !== "" || estado !== "todas" || barberoId !== "todos" || fechaDesde !== "" || fechaHasta !== "";

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("todas");
    setBarberoId("todos");
    setFechaDesde("");
    setFechaHasta("");
  }

  // ---------- Estadísticas (sobre el resultado filtrado) ----------
  const stats = useMemo(() => {
    const pendientes = citasFiltradas.filter((c) => c.estado === "pendiente").length;
    const confirmadas = citasFiltradas.filter((c) => c.estado === "confirmada").length;
    const sinPagar = citasFiltradas.filter((c) => c.estado_pago === "pendiente" && c.estado !== "cancelada").length;
    const ingresoPagado = citasFiltradas
      .filter((c) => c.estado_pago === "pagado")
      .reduce((acc, c) => acc + Number(c.servicios?.precio ?? 0), 0);
    return { pendientes, confirmadas, sinPagar, ingresoPagado };
  }, [citasFiltradas]);

  const conteoPorEstado = (e: string) => citas.filter((c) => c.estado === e).length;

  if (cargando) {
    return (
      <div className="flex items-center gap-2 font-body text-criss">
        <RefreshCw size={16} className="animate-spin" />
        Cargando reservas...
      </div>
    );
  }

  return (
    <div>
      {/* ==================== HEADER ==================== */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg uppercase text-blanco">Reservas</h2>
          <p className="font-body text-xs text-criss">Se actualiza automáticamente en tiempo real.</p>
        </div>
        {actualizando && (
          <span className="flex items-center gap-1.5 font-body text-xs text-criss">
            <RefreshCw size={12} className="animate-spin" /> Sincronizando
          </span>
        )}
      </div>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

      {/* ==================== TARJETAS DE RESUMEN ==================== */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-carbon-2 bg-carbon-1 p-3.5">
          <p className="mb-1 flex items-center gap-1.5 font-body text-[11px] uppercase text-criss">
            <CalendarClock size={12} /> Pendientes
          </p>
          <p className="font-display text-xl text-amber-400">{stats.pendientes}</p>
        </div>
        <div className="rounded-xl border border-carbon-2 bg-carbon-1 p-3.5">
          <p className="mb-1 flex items-center gap-1.5 font-body text-[11px] uppercase text-criss">
            <Calendar size={12} /> Confirmadas
          </p>
          <p className="font-display text-xl text-sky-400">{stats.confirmadas}</p>
        </div>
        <div className="rounded-xl border border-carbon-2 bg-carbon-1 p-3.5">
          <p className="mb-1 flex items-center gap-1.5 font-body text-[11px] uppercase text-criss">
            <CalendarX size={12} /> Sin pagar
          </p>
          <p className="font-display text-xl text-blanco">{stats.sinPagar}</p>
        </div>
        <div className="rounded-xl border border-amarillo/30 bg-amarillo/5 p-3.5">
          <p className="mb-1 flex items-center gap-1.5 font-body text-[11px] uppercase text-criss">
            <Wallet size={12} /> Cobrado (filtro)
          </p>
          <p className="font-display text-xl text-amarillo">S/ {stats.ingresoPagado.toFixed(2)}</p>
        </div>
      </div>

      {/* ==================== BUSCADOR + FILTROS ==================== */}
      <div className="mb-4 rounded-xl border border-carbon-2 bg-carbon-1 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-criss" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full rounded-lg border border-carbon-2 bg-negro py-2.5 pl-9 pr-3 font-body text-sm text-blanco outline-none focus:border-amarillo"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltrosAbiertos((v) => !v)}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-body text-sm transition-colors ${
              filtrosAbiertos || hayFiltrosActivos
                ? "border-amarillo bg-amarillo/10 text-amarillo"
                : "border-carbon-2 text-criss hover:text-blanco"
            }`}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {hayFiltrosActivos && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amarillo text-[10px] font-bold text-negro">
                •
              </span>
            )}
          </button>
        </div>

        {filtrosAbiertos && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-carbon-2 pt-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-body text-[11px] uppercase text-criss">Barbero</label>
              <div className="relative">
                <Scissors size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-criss" />
                <select
                  value={barberoId}
                  onChange={(e) => setBarberoId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-carbon-2 bg-negro py-2 pl-9 pr-3 font-body text-sm text-blanco outline-none focus:border-amarillo"
                >
                  <option value="todos">Todos los barberos</option>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-body text-[11px] uppercase text-criss">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-carbon-2 bg-negro px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-[11px] uppercase text-criss">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-carbon-2 bg-negro px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
              />
            </div>
          </div>
        )}
      </div>

      {/* ==================== PÍLDORAS DE ESTADO ==================== */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEstado("todas")}
          className={`rounded-full px-3.5 py-1.5 font-body text-xs font-medium transition-colors ${
            estado === "todas" ? "bg-blanco text-negro" : "bg-carbon text-criss hover:bg-carbon-2"
          }`}
        >
          Todas ({citas.length})
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setEstado(e)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-body text-xs font-medium capitalize transition-colors ${
              estado === e ? "bg-blanco text-negro" : "bg-carbon text-criss hover:bg-carbon-2"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_PUNTO[e]}`} />
            {e} ({conteoPorEstado(e)})
          </button>
        ))}

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="ml-auto flex items-center gap-1 font-body text-xs text-criss underline-offset-2 hover:text-amarillo hover:underline"
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      <p className="mb-3 font-body text-xs text-criss">
        Mostrando <span className="text-blanco">{citasFiltradas.length}</span> de {citas.length} reservas
      </p>

      {/* ==================== RESULTADOS ==================== */}
      {citasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-carbon-2 py-16 text-center">
          <UsersIcon size={24} className="text-criss" />
          <p className="font-body text-criss">No hay reservas que coincidan con estos filtros.</p>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="font-body text-xs text-amarillo underline-offset-2 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ---------- TABLA (escritorio, md en adelante) ---------- */}
          <div className="hidden overflow-hidden rounded-xl border border-carbon-2 md:block">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-carbon-1">
                  <tr className="font-body text-[11px] uppercase text-criss">
                    <th className="whitespace-nowrap px-4 py-3 text-left">Cliente</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Servicio</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Barbero</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Fecha</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Hora</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Precio</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Estado</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Pago</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {citasFiltradas.map((cita, i) => (
                    <tr
                      key={cita.id}
                      className={`border-t border-carbon-2 font-body text-sm transition-colors hover:bg-carbon-1 ${
                        i % 2 === 0 ? "bg-carbon-1/30" : "bg-transparent"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-blanco">{cita.cliente_nombre}</p>
                        <p className="flex items-center gap-1 text-xs text-criss">
                          <Phone size={10} /> {cita.cliente_telefono}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-criss">{cita.servicios?.nombre ?? "Eliminado"}</td>
                      <td className="px-4 py-3 text-criss">
                        <span className="flex items-center gap-1.5">
                          <Scissors size={12} />
                          {cita.barberos?.nombre ?? "Sin asignar"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-criss">{formatearFechaCorta(cita.fecha)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-criss">{cita.hora.slice(0, 5)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-blanco">
                        {cita.servicios?.precio != null ? `S/ ${Number(cita.servicios.precio).toFixed(2)}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${ESTADO_ESTILO[cita.estado]}`}
                        >
                          {cita.estado}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${
                            cita.estado_pago === "pagado"
                              ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-400"
                              : "border-carbon-2 bg-carbon text-criss"
                          }`}
                        >
                          {cita.estado_pago === "pagado" ? cita.metodo_pago : "Sin pagar"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={cita.estado}
                            onChange={(e) => pedirCambioEstado(cita, e.target.value)}
                            className="rounded-lg border border-carbon-2 bg-negro px-2 py-1.5 font-body text-xs text-blanco outline-none focus:border-amarillo"
                          >
                            {ESTADOS.map((e) => (
                              <option key={e} value={e}>
                                {e}
                              </option>
                            ))}
                          </select>
                          {cita.estado_pago === "pendiente" && cita.estado !== "cancelada" && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalCobro(cita);
                                setMetodoCobro("efectivo");
                              }}
                              title="Cobrar"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amarillo text-negro transition-transform hover:scale-105"
                            >
                              <DollarSign size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------- TARJETAS (móvil, debajo de md) ---------- */}
          <div className="flex flex-col gap-3 md:hidden">
            {citasFiltradas.map((cita) => (
              <div
                key={cita.id}
                className={`rounded-xl border border-carbon-2 border-l-4 bg-carbon-1 p-4 ${ESTADO_BORDE[cita.estado]}`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-carbon-2 text-blanco">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="font-display text-sm text-blanco">{cita.cliente_nombre}</p>
                      <p className="flex items-center gap-1 font-body text-xs text-criss">
                        <Phone size={11} /> {cita.cliente_telefono}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full border px-2.5 py-1 font-body text-[10px] font-semibold uppercase ${ESTADO_ESTILO[cita.estado]}`}>
                      {cita.estado}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-body text-[10px] font-semibold uppercase ${
                        cita.estado_pago === "pagado"
                          ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-400"
                          : "border-carbon-2 bg-carbon text-criss"
                      }`}
                    >
                      {cita.estado_pago === "pagado" ? `${cita.metodo_pago}` : "Sin pagar"}
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-carbon-2 pt-3 font-body text-xs text-criss">
                  <span className="font-medium text-blanco">{cita.servicios?.nombre ?? "Eliminado"}</span>
                  <span className="flex items-center gap-1">
                    <Scissors size={12} /> {cita.barberos?.nombre ?? "Sin asignar"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {formatearFechaCorta(cita.fecha)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {cita.hora.slice(0, 5)}
                  </span>
                  {cita.servicios?.precio != null && (
                    <span className="font-semibold text-blanco">S/ {Number(cita.servicios.precio).toFixed(2)}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={cita.estado}
                    onChange={(e) => pedirCambioEstado(cita, e.target.value)}
                    className="flex-1 rounded-lg border border-carbon-2 bg-negro px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        Marcar como {e}
                      </option>
                    ))}
                  </select>
                  {cita.estado_pago === "pendiente" && cita.estado !== "cancelada" && (
                    <Button
                      type="button"
                      onClick={() => {
                        setModalCobro(cita);
                        setMetodoCobro("efectivo");
                      }}
                      className="!px-4 !py-2 text-xs"
                    >
                      <span className="flex items-center gap-1">
                        <DollarSign size={13} /> Cobrar
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==================== MODALES ==================== */}
      <ConfirmModal
        abierto={!!cambioPendiente}
        titulo="Cambiar estado de la reserva"
        mensaje={
          cambioPendiente
            ? `¿Marcar la reserva de ${cambioPendiente.cita.cliente_nombre} como "${cambioPendiente.nuevoEstado}"?`
            : ""
        }
        variante={cambioPendiente?.nuevoEstado === "cancelada" ? "peligro" : "normal"}
        textoConfirmar="Sí, cambiar"
        procesando={procesandoCambio}
        onConfirmar={confirmarCambioEstado}
        onCancelar={() => setCambioPendiente(null)}
      />

      <Modal abierto={!!modalCobro} onCerrar={() => setModalCobro(null)} titulo="Cobrar reserva" ancho="sm">
        {modalCobro && (
          <>
            <p className="mb-1 font-display text-base text-blanco">{modalCobro.cliente_nombre}</p>
            <p className="mb-4 font-body text-sm text-criss">
              {modalCobro.servicios?.nombre} · {modalCobro.barberos?.nombre ?? "Sin asignar"} · S/{" "}
              {Number(modalCobro.servicios?.precio ?? 0).toFixed(2)}
            </p>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Método de pago</label>
            <div className="mb-5 flex gap-2">
              {(["efectivo", "yape"] as const).map((mp) => (
                <button
                  key={mp}
                  type="button"
                  onClick={() => setMetodoCobro(mp)}
                  className={`flex-1 rounded-lg border py-2 font-body text-sm capitalize transition-colors ${
                    metodoCobro === mp ? "border-amarillo bg-amarillo/10 text-amarillo" : "border-carbon-2 text-criss"
                  }`}
                >
                  {mp}
                </button>
              ))}
            </div>
            <Button type="button" disabled={procesandoCobro} onClick={handleCobro} className="w-full">
              {procesandoCobro ? "Procesando..." : "Confirmar cobro"}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}