import { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Lock, RefreshCw, Receipt } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  fetchCajaSesionActiva,
  fetchMovimientosCaja,
  fetchReservasPendientesDePago,
  abrirCaja,
  cerrarCaja,
  registrarMovimientoManual,
  registrarPagoReserva,
  type CajaSesionDB,
  type CajaMovimientoDB,
  type CitaDB,
} from "../../lib/adminApi";

type MetodoPago = "efectivo" | "yape";

export function CajaTab() {
  const { usuario } = useAuth();
  const [sesion, setSesion] = useState<CajaSesionDB | null>(null);
  const [movimientos, setMovimientos] = useState<CajaMovimientoDB[]>([]);
  const [pendientes, setPendientes] = useState<CitaDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [modalAbrir, setModalAbrir] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");

  const [modalCerrar, setModalCerrar] = useState(false);
  const [montoReal, setMontoReal] = useState("");

  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [tipoMov, setTipoMov] = useState<"ingreso" | "egreso">("egreso");
  const [conceptoMov, setConceptoMov] = useState("");
  const [montoMov, setMontoMov] = useState("");
  const [metodoMov, setMetodoMov] = useState<MetodoPago>("efectivo");

  const [modalCobro, setModalCobro] = useState<CitaDB | null>(null);
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>("efectivo");

  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true);
    else setCargando(true);
    try {
      const sesionActiva = await fetchCajaSesionActiva();
      setSesion(sesionActiva);
      const [movs, pend] = await Promise.all([
        sesionActiva ? fetchMovimientosCaja(sesionActiva.id) : Promise.resolve([]),
        fetchReservasPendientesDePago(),
      ]);
      setMovimientos(movs);
      setPendientes(pend);
      setError(null);
    } catch {
      setError("No se pudo cargar la información de caja.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargar();

    const canal = supabase
      .channel("admin-caja")
      .on("postgres_changes", { event: "*", schema: "public", table: "caja_sesiones" }, () => cargar(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "caja_movimientos" }, () => cargar(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => cargar(true))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  const ingresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((acc, m) => acc + Number(m.monto), 0);
  const egresos = movimientos.filter((m) => m.tipo === "egreso").reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEsperado = (sesion?.monto_inicial ?? 0) + ingresos - egresos;

  async function handleAbrirCaja() {
    if (!usuario) return;
    const monto = parseFloat(montoInicial);
    if (isNaN(monto) || monto < 0) {
      setError("Ingresa un monto inicial válido.");
      return;
    }
    setProcesando(true);
    try {
      await abrirCaja(usuario.token, monto);
      setModalAbrir(false);
      setMontoInicial("");
      cargar();
    } catch {
      setError("No se pudo abrir la caja.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleCerrarCaja() {
    if (!usuario) return;
    const monto = parseFloat(montoReal);
    if (isNaN(monto) || monto < 0) {
      setError("Ingresa el monto contado.");
      return;
    }
    setProcesando(true);
    try {
      await cerrarCaja(usuario.token, monto);
      setModalCerrar(false);
      setMontoReal("");
      cargar();
    } catch {
      setError("No se pudo cerrar la caja.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleMovimientoManual() {
    if (!usuario) return;
    const monto = parseFloat(montoMov);
    if (!conceptoMov.trim() || isNaN(monto) || monto <= 0) {
      setError("Completa el concepto y un monto válido.");
      return;
    }
    setProcesando(true);
    try {
      await registrarMovimientoManual(
        usuario.token,
        tipoMov,
        conceptoMov.trim(),
        monto,
        tipoMov === "ingreso" ? metodoMov : undefined
      );
      setModalMovimiento(false);
      setConceptoMov("");
      setMontoMov("");
      cargar();
    } catch {
      setError("No se pudo registrar el movimiento.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleCobro() {
    if (!usuario || !modalCobro) return;
    setProcesando(true);
    try {
      await registrarPagoReserva(usuario.token, modalCobro.id, metodoCobro);
      setModalCobro(null);
      cargar();
    } catch {
      setError("No se pudo registrar el cobro.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 font-body text-criss">
        <RefreshCw size={16} className="animate-spin" />
        Cargando caja...
      </div>
    );
  }

  // ------------------- CAJA CERRADA -------------------
  if (!sesion) {
    return (
      <div>
        <h2 className="mb-1 font-display text-lg text-blanco">Caja</h2>
        <p className="mb-6 font-body text-xs text-criss">No hay una caja abierta en este momento.</p>

        {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-carbon-2 bg-carbon py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-carbon-2">
            <Lock size={22} className="text-criss" />
          </div>
          <p className="mb-5 max-w-xs font-body text-sm text-criss">
            Abre la caja para empezar a registrar cobros del día.
          </p>
          <Button type="button" onClick={() => setModalAbrir(true)}>
            Abrir caja
          </Button>
        </div>

        <Modal abierto={modalAbrir} onCerrar={() => setModalAbrir(false)} titulo="Abrir caja" ancho="sm">
          <label className="mb-1 block font-body text-xs uppercase text-criss">Monto inicial (S/)</label>
          <input
            type="number"
            inputMode="decimal"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
            placeholder="0.00"
            className="mb-4 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
          />
          <Button type="button" disabled={procesando} onClick={handleAbrirCaja} className="w-full">
            {procesando ? "Abriendo..." : "Confirmar apertura"}
          </Button>
        </Modal>
      </div>
    );
  }

  // ------------------- CAJA ABIERTA -------------------
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-blanco">Caja</h2>
        {actualizando && (
          <span className="flex items-center gap-1.5 font-body text-xs text-criss">
            <RefreshCw size={12} className="animate-spin" /> Sincronizando
          </span>
        )}
      </div>
      <p className="mb-6 font-body text-xs text-criss">
        Abierta {sesion.abierta_por ? `por ${sesion.abierta_por}` : ""} ·{" "}
        {new Date(sesion.abierta_en).toLocaleString("es-PE")}
      </p>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

      {/* Resumen: tarjeta principal + 3 secundarias */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="rounded-2xl bg-negro p-5 text-blanco">
          <p className="mb-1 flex items-center gap-1.5 font-body text-xs text-white/60">
            <DollarSign size={13} /> Total en caja
          </p>
          <p className="font-display text-3xl">S/ {totalEsperado.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-carbon-2 bg-carbon p-4">
          <p className="mb-1 flex items-center gap-1.5 font-body text-xs text-criss">
            <Wallet size={13} /> Inicial
          </p>
          <p className="font-display text-lg text-blanco">S/ {Number(sesion.monto_inicial).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-1 flex items-center gap-1.5 font-body text-xs text-emerald-600">
            <TrendingUp size={13} /> Ingresos
          </p>
          <p className="font-display text-lg text-emerald-600">S/ {ingresos.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-amarillo/30 bg-amarillo/10 p-4">
          <p className="mb-1 flex items-center gap-1.5 font-body text-xs text-amarillo">
            <TrendingDown size={13} /> Egresos
          </p>
          <p className="font-display text-lg text-amarillo">S/ {egresos.toFixed(2)}</p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Button type="button" onClick={() => setModalMovimiento(true)} className="!px-4 !py-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Movimiento manual
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setModalCerrar(true)}
          className="!px-4 !py-2 text-xs sm:text-sm"
        >
          Cerrar caja
        </Button>
      </div>

      {/* Reservas pendientes de cobro */}
      <div className="mb-8">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm text-blanco">
          Reservas por cobrar
          {pendientes.length > 0 && (
            <span className="rounded-full bg-amarillo px-2 py-0.5 text-xs font-semibold text-negro">
              {pendientes.length}
            </span>
          )}
        </h3>
        {pendientes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-carbon-2 py-8 text-center">
            <p className="font-body text-sm text-criss">No hay reservas pendientes de pago.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendientes.map((c) => (
              <div key={c.id} className="rounded-2xl border border-carbon-2 bg-carbon p-4">
                <p className="font-display text-sm text-blanco">{c.cliente_nombre}</p>
                <p className="mb-3 font-body text-xs text-criss">
                  {c.servicios?.nombre ?? "Servicio"} · S/ {Number(c.servicios?.precio ?? 0).toFixed(2)}
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setModalCobro(c);
                    setMetodoCobro("efectivo");
                  }}
                  className="w-full !py-2 text-xs"
                >
                  Cobrar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Movimientos */}
      <div>
        <h3 className="mb-3 font-display text-sm text-blanco">Movimientos de hoy</h3>
        {movimientos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-carbon-2 py-8 text-center">
            <Receipt size={22} className="mx-auto mb-2 text-criss" />
            <p className="font-body text-sm text-criss">Aún no hay movimientos en esta sesión.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {movimientos.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-carbon-2 bg-carbon px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.tipo === "ingreso" ? "bg-emerald-500/15" : "bg-amarillo/15"
                    }`}
                  >
                    {m.tipo === "ingreso" ? (
                      <TrendingUp size={14} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={14} className="text-amarillo" />
                    )}
                  </div>
                  <div>
                    <p className="font-body text-sm text-blanco">{m.concepto}</p>
                    <p className="font-body text-xs capitalize text-criss">
                      {m.origen} {m.metodo_pago ? `· ${m.metodo_pago}` : ""} ·{" "}
                      {new Date(m.creado_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 font-display text-sm ${
                    m.tipo === "ingreso" ? "text-emerald-600" : "text-amarillo"
                  }`}
                >
                  {m.tipo === "ingreso" ? "+" : "-"} S/ {Number(m.monto).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: movimiento manual */}
      <Modal abierto={modalMovimiento} onCerrar={() => setModalMovimiento(false)} titulo="Registrar movimiento" ancho="sm">
        <div className="mb-4 flex gap-2">
          {(["ingreso", "egreso"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoMov(t)}
              className={`flex-1 rounded-lg border py-2 font-body text-sm capitalize transition-colors ${
                tipoMov === t ? "border-amarillo bg-amarillo/10 text-amarillo" : "border-carbon-2 text-criss"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="mb-1 block font-body text-xs uppercase text-criss">Concepto</label>
        <input
          type="text"
          value={conceptoMov}
          onChange={(e) => setConceptoMov(e.target.value)}
          placeholder="Ej. Compra de insumos"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <label className="mb-1 block font-body text-xs uppercase text-criss">Monto (S/)</label>
        <input
          type="number"
          inputMode="decimal"
          value={montoMov}
          onChange={(e) => setMontoMov(e.target.value)}
          placeholder="0.00"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        {tipoMov === "ingreso" && (
          <>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Método de pago</label>
            <div className="mb-4 flex gap-2">
              {(["efectivo", "yape"] as const).map((mp) => (
                <button
                  key={mp}
                  type="button"
                  onClick={() => setMetodoMov(mp)}
                  className={`flex-1 rounded-lg border py-2 font-body text-sm capitalize transition-colors ${
                    metodoMov === mp ? "border-amarillo bg-amarillo/10 text-amarillo" : "border-carbon-2 text-criss"
                  }`}
                >
                  {mp}
                </button>
              ))}
            </div>
          </>
        )}
        <Button type="button" disabled={procesando} onClick={handleMovimientoManual} className="mt-1 w-full">
          {procesando ? "Guardando..." : "Registrar"}
        </Button>
      </Modal>

      {/* Modal: cerrar caja */}
      <Modal abierto={modalCerrar} onCerrar={() => setModalCerrar(false)} titulo="Cerrar caja" ancho="sm">
        <p className="mb-4 font-body text-sm text-criss">
          Total esperado en caja:{" "}
          <span className="font-display text-blanco">S/ {totalEsperado.toFixed(2)}</span>
        </p>
        <label className="mb-1 block font-body text-xs uppercase text-criss">Monto contado físicamente (S/)</label>
        <input
          type="number"
          inputMode="decimal"
          value={montoReal}
          onChange={(e) => setMontoReal(e.target.value)}
          placeholder="0.00"
          className="mb-2 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        {montoReal && !isNaN(parseFloat(montoReal)) && (
          <p className="mb-4 font-body text-xs text-criss">
            Diferencia:{" "}
            <span className={parseFloat(montoReal) - totalEsperado === 0 ? "text-emerald-600" : "text-amarillo"}>
              S/ {(parseFloat(montoReal) - totalEsperado).toFixed(2)}
            </span>
          </p>
        )}
        <Button type="button" disabled={procesando} onClick={handleCerrarCaja} className="mt-1 w-full">
          {procesando ? "Cerrando..." : "Confirmar cierre"}
        </Button>
      </Modal>

      {/* Modal: cobrar reserva */}
      <Modal abierto={!!modalCobro} onCerrar={() => setModalCobro(null)} titulo="Cobrar reserva" ancho="sm">
        {modalCobro && (
          <>
            <p className="mb-1 font-display text-base text-blanco">{modalCobro.cliente_nombre}</p>
            <p className="mb-4 font-body text-sm text-criss">
              {modalCobro.servicios?.nombre} · S/ {Number(modalCobro.servicios?.precio ?? 0).toFixed(2)}
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
            <Button type="button" disabled={procesando} onClick={handleCobro} className="w-full">
              {procesando ? "Procesando..." : "Confirmar cobro"}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}