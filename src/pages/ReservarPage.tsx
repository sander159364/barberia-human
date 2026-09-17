import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, User, Phone, Timer, Scissors, ChevronRight, Pencil, ShoppingBag } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/ui/Button";
import { ImagenConCarga } from "../components/ui/ImagenConCarga";
import { supabase } from "../lib/supabaseClient";
import { obtenerSessionId } from "../lib/sesionCliente";
import { useServicios } from "../hooks/useServicios";
import { useBarberos } from "../hooks/useBarberos";
import { SelectorHorarios } from "../components/SelectorHorarios";

type Paso = "servicio" | "barbero" | "horario" | "datos";
const DURACION_BLOQUEO_SEG = 120;
const PASOS: { id: Paso; label: string }[] = [
  { id: "servicio", label: "Servicio" },
  { id: "barbero", label: "Barbero" },
  { id: "horario", label: "Horario" },
  { id: "datos", label: "Tus datos" },
];

function PasoAnimado({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    if (activo) {
      const t = setTimeout(() => setMontado(true), 20);
      return () => clearTimeout(t);
    } else {
      setMontado(false);
    }
  }, [activo]);
  if (!activo) return null;
  return (
    <div className={`transition-all duration-300 ease-out ${montado ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}>
      {children}
    </div>
  );
}

export function ReservarPage() {
  const navigate = useNavigate();
  const { servicios, cargando: cargandoServicios, sincronizando } = useServicios();
  const sessionId = useRef(obtenerSessionId()).current;

  useEffect(() => {
    const anterior = document.title;
    document.title = "Reservas · H. Barber";
    return () => {
      document.title = anterior;
    };
  }, []);

  const [paso, setPaso] = useState<Paso>("servicio");
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [seleccionandoId, setSeleccionandoId] = useState<string | null>(null);
  const [barberoId, setBarberoId] = useState<string | null>(null);
  const [seleccionandoBarberoId, setSeleccionandoBarberoId] = useState<string | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<{ fecha: string; hora: string } | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(DURACION_BLOQUEO_SEG);

  const { barberos, cargando: cargandoBarberos } = useBarberos(servicioId);

  const servicioSeleccionado = useMemo(
    () => servicios.find((s) => s.id === servicioId) ?? null,
    [servicios, servicioId]
  );
  const barberoSeleccionado = useMemo(
    () => barberos.find((b) => b.id === barberoId) ?? null,
    [barberos, barberoId]
  );

  const pasoIndex = PASOS.findIndex((p) => p.id === paso);

  const liberarBloqueoActual = useCallback(async () => {
    if (!horaSeleccionada || !barberoId) return;
    await supabase.rpc("liberar_horario", {
      p_fecha: horaSeleccionada.fecha,
      p_hora: horaSeleccionada.hora,
      p_session_id: sessionId,
      p_barbero_id: barberoId,
    });
  }, [horaSeleccionada, sessionId, barberoId]);

  function elegirServicio(id: string) {
    setSeleccionandoId(id);
    setTimeout(() => {
      setServicioId(id);
      setBarberoId(null);
      setPaso("barbero");
      setSeleccionandoId(null);
    }, 250);
  }

  function elegirBarbero(id: string) {
    setSeleccionandoBarberoId(id);
    setTimeout(() => {
      setBarberoId(id);
      setPaso("horario");
      setSeleccionandoBarberoId(null);
    }, 250);
  }

  async function elegirHorario(fecha: string, hora: string) {
    setError(null);
    if (!barberoId) return;

    const { error: bloqueoError } = await supabase.rpc("tomar_horario", {
      p_fecha: fecha,
      p_hora: hora,
      p_session_id: sessionId,
      p_barbero_id: barberoId,
    });

    if (bloqueoError) {
      setError("Ese horario acaba de ser tomado por otra persona. Elige otro.");
      return;
    }

    setHoraSeleccionada({ fecha, hora });
    setSegundosRestantes(DURACION_BLOQUEO_SEG);
    setTimeout(() => setPaso("datos"), 250);
  }

  async function volver() {
    if (paso === "barbero") {
      setPaso("servicio");
      setServicioId(null);
      setBarberoId(null);
    } else if (paso === "horario") {
      setPaso("barbero");
      setHoraSeleccionada(null);
    } else if (paso === "datos") {
      await liberarBloqueoActual();
      setHoraSeleccionada(null);
      setPaso("horario");
    }
  }

  function irAPaso(destino: Paso) {
    if (destino === "horario" && horaSeleccionada) {
      liberarBloqueoActual();
      setHoraSeleccionada(null);
    }
    setPaso(destino);
  }

  useEffect(() => {
    if (paso !== "datos" || !horaSeleccionada) return;

    const intervalo = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo);
          liberarBloqueoActual();
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [paso, horaSeleccionada, liberarBloqueoActual, navigate]);

  useEffect(() => {
    function alSalir() {
      if (horaSeleccionada && barberoId) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/liberar_horario`,
          new Blob(
            [
              JSON.stringify({
                p_fecha: horaSeleccionada.fecha,
                p_hora: horaSeleccionada.hora,
                p_session_id: sessionId,
                p_barbero_id: barberoId,
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    }
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [horaSeleccionada, sessionId, barberoId]);

  async function handleReservar() {
    setError(null);
    if (!servicioId || !barberoId || !horaSeleccionada || !nombre || !telefono) {
      setError("Completa tu nombre y celular.");
      return;
    }

    setEnviando(true);
    const { error: insertError } = await supabase.from("reservas").insert({
      cliente_nombre: nombre,
      cliente_telefono: telefono,
      cliente_email: null,
      servicio_id: servicioId,
      barbero_id: barberoId,
      fecha: horaSeleccionada.fecha,
      hora: horaSeleccionada.hora,
    });

    if (insertError) {
      setEnviando(false);
      if (insertError.code === "23505") {
        setError("Ese horario ya no está disponible. Elige otro.");
        setPaso("horario");
        setHoraSeleccionada(null);
      } else {
        setError("No se pudo completar la reserva. Intenta de nuevo.");
      }
      return;
    }

    await liberarBloqueoActual();
    setEnviando(false);
    setExito(true);
    setTimeout(() => navigate("/"), 2200);
  }

  const minutos = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
  const segundos = String(segundosRestantes % 60).padStart(2, "0");
  const urgente = segundosRestantes <= 30;

  if (exito) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="flex h-20 w-20 animate-[scaleIn_0.4s_ease-out] items-center justify-center rounded-full bg-amarillo shadow-lg shadow-amarillo/30 sm:h-24 sm:w-24">
          <Check size={40} strokeWidth={2.5} className="text-negro sm:hidden" />
          <Check size={44} strokeWidth={2.5} className="hidden text-negro sm:block" />
        </div>
        <h1 className="mt-6 text-center font-display text-xl font-bold uppercase text-neutral-900 sm:text-2xl">
          ¡Reserva confirmada!
        </h1>
        <p className="mt-2 text-center font-body text-sm text-neutral-500">Te esperamos. Redirigiendo al inicio...</p>
      </div>
    );
  }

  const mostrarResumen = paso !== "servicio";

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Header + Stepper */}
      <div className="border-b border-neutral-200 bg-white px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-16">
        <div className="mx-auto max-w-7xl">
          {paso === "servicio" ? (
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 font-body text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:mb-5"
            >
              <ArrowLeft size={16} /> Volver al inicio
            </Link>
          ) : (
            <button
              onClick={volver}
              className="mb-4 inline-flex items-center gap-2 font-body text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 sm:mb-5"
            >
              <ArrowLeft size={16} /> Atrás
            </button>
          )}

          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">
            Reserva tu cita
          </h1>

          {/* Stepper: en móvil, etiquetas ocultas para no apretar; en sm+ aparecen */}
          <div className="mt-5 flex max-w-2xl items-center sm:mt-6">
            {PASOS.map((p, i) => {
              const completado = i < pasoIndex;
              const actual = i === pasoIndex;
              return (
                <div key={p.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-body text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                        completado
                          ? "bg-neutral-900 text-white"
                          : actual
                          ? "bg-amarillo text-negro ring-4 ring-amarillo/20"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {completado ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </div>
                    <span
                      className={`hidden font-body text-[11px] font-medium sm:block ${
                        actual ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {p.label}
                    </span>
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className={`mx-1.5 h-0.5 flex-1 rounded-full transition-colors sm:mx-2 ${completado ? "bg-neutral-900" : "bg-neutral-100"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra compacta de resumen — solo móvil/tablet, oculta en escritorio (ahí se usa el aside) */}
      {mostrarResumen && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto">
            {servicioSeleccionado && (
              <button
                onClick={() => irAPaso("servicio")}
                className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3"
              >
                <ImagenConCarga
                  url={servicioSeleccionado.imagen_url}
                  alt={servicioSeleccionado.nombre}
                  icono={<Scissors size={11} className="text-neutral-300" />}
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="font-body text-xs font-semibold text-neutral-900">{servicioSeleccionado.nombre}</span>
              </button>
            )}
            {barberoSeleccionado && (
              <button
                onClick={() => irAPaso("barbero")}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5"
              >
                <Scissors size={11} className="text-neutral-400" />
                <span className="font-body text-xs font-semibold text-neutral-900">{barberoSeleccionado.nombre}</span>
              </button>
            )}
            {horaSeleccionada && (
              <button
                onClick={() => paso !== "datos" && irAPaso("horario")}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5"
              >
                <Clock size={11} className="text-neutral-400" />
                <span className="font-body text-xs font-semibold text-neutral-900">
                  {new Date(horaSeleccionada.fecha + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                  {" · "}
                  {horaSeleccionada.hora.slice(0, 5)}
                </span>
              </button>
            )}
            {servicioSeleccionado && (
              <span className="ml-auto shrink-0 font-display text-sm font-bold text-neutral-900">
                S/ {servicioSeleccionado.precio}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Layout principal */}
      <main className="px-4 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
          {/* ---------------- COLUMNA PRINCIPAL ---------------- */}
          <div>
            {error && paso !== "datos" && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:mb-5">
                <p className="font-body text-sm font-medium text-amber-800">{error}</p>
              </div>
            )}

            {/* ---------------- PASO: SERVICIO ---------------- */}
            <PasoAnimado activo={paso === "servicio"}>
              {cargandoServicios ? (
                <p className="font-body text-sm text-neutral-400">Cargando servicios...</p>
              ) : (
                <div className="relative">
                  {sincronizando && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm transition-opacity duration-200">
                      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-amarillo" />
                        <span className="font-body text-xs font-medium text-neutral-500">Actualizando servicios...</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 transition-opacity duration-200 ${
                      sincronizando ? "pointer-events-none opacity-40 grayscale" : ""
                    }`}
                  >
                    {servicios.map((s) => {
                      const seleccionando = seleccionandoId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => elegirServicio(s.id)}
                          className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 ${
                            seleccionando
                              ? "scale-[0.98] border-amarillo ring-2 ring-amarillo/30"
                              : "border-neutral-200 hover:-translate-y-1 hover:shadow-lg"
                          }`}
                        >
                          <div className="relative h-32 w-full overflow-hidden bg-neutral-100 sm:h-40">
                            <ImagenConCarga
                              url={s.imagen_url}
                              alt={s.nombre}
                              icono={<Scissors size={24} className="text-neutral-300" />}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 font-display text-xs font-bold text-neutral-900 shadow-sm backdrop-blur-sm sm:right-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-sm">
                              S/ {s.precio}
                            </span>
                            {seleccionando && (
                              <div className="absolute inset-0 flex items-center justify-center bg-negro/40">
                                <span className="flex h-9 w-9 animate-[scaleIn_0.2s_ease-out] items-center justify-center rounded-full bg-amarillo text-negro">
                                  <Check size={18} strokeWidth={3} />
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-3.5 sm:p-4">
                            <h3 className="font-display text-sm font-bold text-neutral-900 sm:text-base">{s.nombre}</h3>
                            <p className="mt-1 line-clamp-2 font-body text-xs text-neutral-500 sm:text-sm">{s.descripcion}</p>
                            <div className="mt-2.5 flex items-center justify-between sm:mt-3">
                              <span className="flex items-center gap-1.5 font-body text-xs font-medium text-neutral-400">
                                <Clock size={12} /> {s.duracion_min} min
                              </span>
                              <span className="hidden items-center gap-1 font-body text-xs font-semibold text-neutral-900 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                                Elegir <ChevronRight size={14} />
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </PasoAnimado>

            {/* ---------------- PASO: BARBERO ---------------- */}
            <PasoAnimado activo={paso === "barbero"}>
              {cargandoBarberos ? (
                <p className="font-body text-sm text-neutral-400">Buscando barberos disponibles...</p>
              ) : barberos.length === 0 ? (
                <p className="font-body text-sm text-neutral-400">
                  No hay barberos disponibles para este servicio por ahora.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {barberos.map((b) => {
                    const seleccionando = seleccionandoBarberoId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => elegirBarbero(b.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 sm:p-4 ${
                          seleccionando
                            ? "scale-[0.98] border-amarillo bg-amarillo/5 ring-2 ring-amarillo/20"
                            : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        <ImagenConCarga
                          url={b.imagen_url}
                          alt={b.nombre}
                          icono={<Scissors size={16} className="text-neutral-400" />}
                          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-neutral-100 sm:h-14 sm:w-14"
                        />
                        <span className="font-display text-sm font-bold text-neutral-900 sm:text-base">{b.nombre}</span>
                        {seleccionando && (
                          <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amarillo text-negro">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </PasoAnimado>

            {/* ---------------- PASO: HORARIO ---------------- */}
            <PasoAnimado activo={paso === "horario"}>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                <SelectorHorarios
                  barberoId={barberoId}
                  servicio={servicioSeleccionado}
                  horaSeleccionada={horaSeleccionada}
                  onSeleccionar={elegirHorario}
                />
              </div>
            </PasoAnimado>

            {/* ---------------- PASO: DATOS ---------------- */}
            <PasoAnimado activo={paso === "datos"}>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                {/* Countdown visible también en móvil, ya que el aside se oculta ahí */}
                <div
                  className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 lg:hidden ${
                    urgente ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <span className={`flex items-center gap-2 font-body text-xs font-medium sm:text-sm ${urgente ? "text-amber-800" : "text-neutral-500"}`}>
                    <Timer size={15} className={urgente ? "text-amber-600" : "text-neutral-400"} />
                    Reservado por
                  </span>
                  <span className={`font-display text-base font-bold tabular-nums sm:text-lg ${urgente ? "text-amber-700" : "text-neutral-900"}`}>
                    {minutos}:{segundos}
                  </span>
                </div>

                <h2 className="mb-4 font-display text-base font-bold text-neutral-900 sm:text-lg">Tus datos</h2>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors focus-within:border-amarillo sm:py-3.5">
                    <User size={16} className="shrink-0 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-transparent font-body text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors focus-within:border-amarillo sm:py-3.5">
                    <Phone size={16} className="shrink-0 text-neutral-400" />
                    <input
                      type="tel"
                      placeholder="Número de celular"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-transparent font-body text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="font-body text-sm font-medium text-amber-800">{error}</p>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={enviando}
                  onClick={handleReservar}
                  className="mt-6 w-full !py-3.5 text-sm font-bold"
                >
                  {enviando ? "Reservando..." : "Confirmar reserva"}
                </Button>
              </div>
            </PasoAnimado>
          </div>

          {/* ---------------- RESUMEN LATERAL: solo escritorio (lg+) ---------------- */}
          <aside className="hidden lg:sticky lg:top-8 lg:block lg:h-fit">
            {!mostrarResumen ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center">
                <ShoppingBag size={22} className="mx-auto mb-2 text-neutral-300" />
                <p className="font-body text-sm text-neutral-400">
                  Elige un servicio para empezar tu reserva.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-neutral-400">
                  Resumen de tu cita
                </h3>

                {servicioSeleccionado && (
                  <div className="mb-3 flex items-center gap-3 border-b border-neutral-100 pb-4">
                    <ImagenConCarga
                      url={servicioSeleccionado.imagen_url}
                      alt={servicioSeleccionado.nombre}
                      icono={<Scissors size={16} className="text-neutral-300" />}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-neutral-900">
                        {servicioSeleccionado.nombre}
                      </p>
                      <p className="flex items-center gap-1 font-body text-xs text-neutral-400">
                        <Clock size={11} /> {servicioSeleccionado.duracion_min} min
                      </p>
                    </div>
                    <button
                      onClick={() => irAPaso("servicio")}
                      className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-900"
                      title="Cambiar servicio"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}

                {barberoSeleccionado && (
                  <div className="mb-3 flex items-center gap-3 border-b border-neutral-100 pb-4">
                    <ImagenConCarga
                      url={barberoSeleccionado.imagen_url}
                      alt={barberoSeleccionado.nombre}
                      icono={<Scissors size={14} className="text-neutral-300" />}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-neutral-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                        Barbero
                      </p>
                      <p className="truncate font-display text-sm font-bold text-neutral-900">
                        {barberoSeleccionado.nombre}
                      </p>
                    </div>
                    <button
                      onClick={() => irAPaso("barbero")}
                      className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-900"
                      title="Cambiar barbero"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}

                {horaSeleccionada && (
                  <div className="mb-3 border-b border-neutral-100 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-body text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          Fecha y hora
                        </p>
                        <p className="font-display text-sm font-bold capitalize text-neutral-900">
                          {new Date(horaSeleccionada.fecha + "T00:00:00").toLocaleDateString("es-PE", {
                            weekday: "long",
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                        <p className="font-body text-sm text-neutral-500">{horaSeleccionada.hora.slice(0, 5)}</p>
                      </div>
                      {paso !== "datos" && (
                        <button
                          onClick={() => irAPaso("horario")}
                          className="text-neutral-300 transition-colors hover:text-neutral-900"
                          title="Cambiar horario"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    {paso === "datos" && (
                      <div
                        className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${
                          urgente ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-neutral-50"
                        }`}
                      >
                        <span className={`flex items-center gap-1.5 font-body text-xs font-medium ${urgente ? "text-amber-800" : "text-neutral-500"}`}>
                          <Timer size={13} className={urgente ? "text-amber-600" : "text-neutral-400"} />
                          Reservado por
                        </span>
                        <span className={`font-display text-sm font-bold tabular-nums ${urgente ? "text-amber-700" : "text-neutral-900"}`}>
                          {minutos}:{segundos}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {servicioSeleccionado && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-body text-sm font-medium text-neutral-500">Total</span>
                    <span className="font-display text-xl font-bold text-neutral-900">
                      S/ {servicioSeleccionado.precio}
                    </span>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}