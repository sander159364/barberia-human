import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, User, Phone, Timer, Scissors } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabaseClient";
import { obtenerSessionId } from "../lib/sesionCliente";
import { useServicios } from "../hooks/useServicios";
import { useBarberos } from "../hooks/useBarberos";
import { SelectorHorarios } from "../components/SelectorHorarios";

type Paso = "servicio" | "barbero" | "horario" | "datos";
const DURACION_BLOQUEO_SEG = 120;
const PASOS: Paso[] = ["servicio", "barbero", "horario", "datos"];

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-negro px-6">
        <div className="flex h-20 w-20 animate-[scaleIn_0.4s_ease-out] items-center justify-center rounded-full bg-amarillo">
          <Check size={40} className="text-negro" />
        </div>
        <h1 className="mt-6 font-display text-2xl uppercase text-blanco">¡Reserva confirmada!</h1>
        <p className="mt-2 font-body text-sm text-criss">Te esperamos. Redirigiendo al inicio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-negro">
      <Header />

      <div className="border-b border-carbon-2 px-6 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          {paso === "servicio" ? (
            <Link to="/" className="mb-4 inline-flex items-center gap-2 font-body text-sm text-criss hover:text-blanco">
              <ArrowLeft size={16} /> Volver al inicio
            </Link>
          ) : (
            <button onClick={volver} className="mb-4 inline-flex items-center gap-2 font-body text-sm text-criss hover:text-blanco">
              <ArrowLeft size={16} /> Atrás
            </button>
          )}

          <h1 className="font-display text-3xl uppercase text-blanco sm:text-4xl">Reserva tu cita</h1>

          <div className="mt-4 flex items-center gap-2">
            {PASOS.map((p, i) => (
              <div
                key={p}
                className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                  paso === p ? "bg-amarillo" : i < PASOS.indexOf(paso) ? "bg-amarillo/50" : "bg-carbon-2"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          {error && paso !== "datos" && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

          <PasoAnimado activo={paso === "servicio"}>
            {cargandoServicios ? (
              <p className="text-criss text-sm">Cargando servicios...</p>
            ) : (
              <div className="relative">
                {sincronizando && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-negro/60 backdrop-blur-[1px] transition-opacity duration-200">
                    <div className="flex items-center gap-2 rounded-full border border-carbon-2 bg-carbon-1 px-4 py-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-criss border-t-amarillo" />
                      <span className="font-body text-xs text-criss">Actualizando servicios...</span>
                    </div>
                  </div>
                )}
                <div
                  className={`grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity duration-200 ${
                    sincronizando ? "pointer-events-none opacity-40 grayscale" : ""
                  }`}
                >
                  {servicios.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => elegirServicio(s.id)}
                      className={`rounded-2xl border p-5 text-left transition-all duration-200 ${
                        seleccionandoId === s.id
                          ? "scale-95 border-amarillo bg-amarillo/10"
                          : "border-carbon-2 bg-carbon-1 hover:border-criss hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display text-lg uppercase text-blanco">{s.nombre}</h3>
                          <p className="mt-1 font-body text-sm text-criss">{s.descripcion}</p>
                          <div className="mt-2 flex items-center gap-3 font-body text-xs text-criss">
                            <span className="flex items-center gap-1"><Clock size={12} /> {s.duracion_min} min</span>
                            <span className="font-semibold text-blanco">S/ {s.precio}</span>
                          </div>
                        </div>
                        {seleccionandoId === s.id && (
                          <span className="flex h-6 w-6 animate-[scaleIn_0.2s_ease-out] items-center justify-center rounded-full bg-amarillo text-negro">
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PasoAnimado>

          <PasoAnimado activo={paso === "barbero"}>
            <div className="rounded-2xl border border-carbon-2 bg-carbon-1 p-6 sm:p-8">
              {servicioSeleccionado && (
                <div className="mb-6 flex items-center justify-between border-b border-carbon-2 pb-4">
                  <div>
                    <p className="font-body text-xs uppercase text-criss">Servicio elegido</p>
                    <p className="font-display text-base text-blanco">{servicioSeleccionado.nombre}</p>
                  </div>
                  <span className="font-body text-sm text-criss">S/ {servicioSeleccionado.precio}</span>
                </div>
              )}

              {cargandoBarberos ? (
                <p className="font-body text-sm text-criss">Buscando barberos disponibles...</p>
              ) : barberos.length === 0 ? (
                <p className="font-body text-sm text-criss">
                  No hay barberos disponibles para este servicio por ahora.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {barberos.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => elegirBarbero(b.id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                        seleccionandoBarberoId === b.id
                          ? "scale-95 border-amarillo bg-amarillo/10"
                          : "border-carbon-2 bg-carbon hover:border-criss hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-carbon-2 text-blanco">
                        <Scissors size={16} />
                      </div>
                      <span className="font-display text-base text-blanco">{b.nombre}</span>
                      {seleccionandoBarberoId === b.id && (
                        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-amarillo text-negro">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PasoAnimado>

          <PasoAnimado activo={paso === "horario"}>
            <div className="rounded-2xl border border-carbon-2 bg-carbon-1 p-6 sm:p-8">
              {servicioSeleccionado && (
                <div className="mb-6 flex items-center justify-between border-b border-carbon-2 pb-4">
                  <div>
                    <p className="font-body text-xs uppercase text-criss">Servicio y barbero</p>
                    <p className="font-display text-base text-blanco">
                      {servicioSeleccionado.nombre} · {barberoSeleccionado?.nombre}
                    </p>
                  </div>
                  <span className="font-body text-sm text-criss">S/ {servicioSeleccionado.precio}</span>
                </div>
              )}
              <SelectorHorarios
                barberoId={barberoId}
                servicio={servicioSeleccionado}
                horaSeleccionada={horaSeleccionada}
                onSeleccionar={elegirHorario}
              />
            </div>
          </PasoAnimado>

          <PasoAnimado activo={paso === "datos"}>
            <div className="rounded-2xl border border-carbon-2 bg-carbon-1 p-6 sm:p-10">
              <div
                className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 ${
                  urgente ? "border-amarillo/50 bg-amarillo/10" : "border-carbon-2 bg-carbon"
                }`}
              >
                <span className="flex items-center gap-2 font-body text-sm text-criss">
                  <Timer size={16} className={urgente ? "text-amarillo" : ""} />
                  Tu horario está reservado por
                </span>
                <span className={`font-display text-lg tabular-nums ${urgente ? "text-amarillo" : "text-blanco"}`}>
                  {minutos}:{segundos}
                </span>
              </div>

              {servicioSeleccionado && horaSeleccionada && (
                <div className="mb-6 border-b border-carbon-2 pb-4">
                  <p className="font-body text-xs uppercase text-criss">Resumen</p>
                  <p className="font-display text-base text-blanco">
                    {servicioSeleccionado.nombre} · {barberoSeleccionado?.nombre}
                  </p>
                  <p className="font-body text-sm text-criss">
                    {new Date(horaSeleccionada.fecha + "T00:00:00").toLocaleDateString("es-PE", {
                      weekday: "long", day: "2-digit", month: "short",
                    })}{" "}
                    · {horaSeleccionada.hora.slice(0, 5)}
                  </p>
                </div>
              )}

              <h2 className="mb-4 font-display text-lg uppercase text-blanco">Tus datos</h2>
              <div className="grid gap-4">
                <div className="flex items-center gap-2 border border-carbon-2 bg-carbon px-4 py-3">
                  <User size={16} className="text-criss" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-transparent text-blanco outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 border border-carbon-2 bg-carbon px-4 py-3">
                  <Phone size={16} className="text-criss" />
                  <input
                    type="tel"
                    placeholder="Número de celular"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-transparent text-blanco outline-none"
                  />
                </div>
              </div>

              {error && <p className="mt-4 font-body text-sm text-amarillo">{error}</p>}

              <Button type="button" disabled={enviando} onClick={handleReservar} className="mt-6 w-full">
                {enviando ? "Reservando..." : "Confirmar reserva"}
              </Button>
            </div>
          </PasoAnimado>
        </div>
      </main>

      <Footer />
    </div>
  );
}