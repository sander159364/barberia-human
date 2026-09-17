import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Scissors, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  fetchBarberos,
  crearBarbero,
  actualizarBarbero,
  eliminarBarbero,
  fetchServicios,
  fetchServiciosDeBarbero,
  actualizarServiciosBarbero,
  fetchHorariosBarbero,
  actualizarHorarioBarbero,
  type BarberoDB,
  type ServicioDB,
  type HorarioBarberoDB,
} from "../../lib/adminApi";

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function BarberosTab() {
  const { usuario } = useAuth();
  const [barberos, setBarberos] = useState<BarberoDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setBarberos(await fetchBarberos());
      setError(null);
    } catch {
      setError("No se pudieron cargar los barberos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel("admin-barberos")
      .on("postgres_changes", { event: "*", schema: "public", table: "barberos" }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  async function handleCrear() {
    if (!usuario || !nombreNuevo.trim()) return;
    setProcesando(true);
    try {
      await crearBarbero(usuario.token, nombreNuevo.trim());
      setModalNuevo(false);
      setNombreNuevo("");
      cargar();
    } catch {
      setError("No se pudo crear el barbero.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleToggleActivo(b: BarberoDB) {
    if (!usuario) return;
    try {
      await actualizarBarbero(usuario.token, { id: b.id, nombre: b.nombre, activo: !b.activo });
      cargar();
    } catch {
      setError("No se pudo actualizar el barbero.");
    }
  }

  async function handleEliminar(id: string) {
    if (!usuario) return;
    if (!confirm("¿Eliminar este barbero? Se borrará su horario y sus servicios asignados.")) return;
    try {
      await eliminarBarbero(usuario.token, id);
      cargar();
    } catch {
      setError("No se pudo eliminar el barbero.");
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 font-body text-criss">
        <RefreshCw size={16} className="animate-spin" />
        Cargando barberos...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg uppercase text-blanco">Barberos</h2>
          <p className="font-body text-xs text-criss">{barberos.length} barbero(s)</p>
        </div>
        <Button className="!px-4 !py-2 gap-2 text-xs sm:text-sm" onClick={() => setModalNuevo(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

      {barberos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-carbon-2 py-12 text-center font-body text-sm text-criss">
          Aún no hay barberos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {barberos.map((b) => (
            <div key={b.id} className="rounded-xl border border-carbon-2 bg-carbon-1">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-carbon-2 text-blanco">
                    <Scissors size={16} />
                  </div>
                  <div>
                    <p className="font-display text-sm text-blanco">{b.nombre}</p>
                    <p className={`font-body text-xs ${b.activo ? "text-emerald-400" : "text-criss"}`}>
                      {b.activo ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActivo(b)}
                    className="rounded-lg border border-carbon-2 px-3 py-1.5 font-body text-xs text-criss hover:text-blanco"
                  >
                    {b.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => handleEliminar(b.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss hover:text-amarillo"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandidoId(expandidoId === b.id ? null : b.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss hover:text-blanco"
                  >
                    {expandidoId === b.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expandidoId === b.id && <DetalleBarbero barbero={b} />}
            </div>
          ))}
        </div>
      )}

      <Modal abierto={modalNuevo} onCerrar={() => setModalNuevo(false)} titulo="Nuevo barbero" ancho="sm">
        <label className="mb-1 block font-body text-xs uppercase text-criss">Nombre</label>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Ej. Carlos Ramírez"
          className="mb-4 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <Button type="button" disabled={procesando} onClick={handleCrear} className="w-full">
          {procesando ? "Creando..." : "Crear barbero"}
        </Button>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------
// Panel expandido: servicios que ofrece + horario semanal
// ---------------------------------------------------------

function DetalleBarbero({ barbero }: { barbero: BarberoDB }) {
  const { usuario } = useAuth();
  const [subTab, setSubTab] = useState<"servicios" | "horario">("servicios");

  const [todosServicios, setTodosServicios] = useState<ServicioDB[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [guardandoServicios, setGuardandoServicios] = useState(false);

  const [horarios, setHorarios] = useState<HorarioBarberoDB[]>([]);
  const [cargandoHorario, setCargandoHorario] = useState(true);
  const [guardandoDia, setGuardandoDia] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarServicios() {
      setCargandoServicios(true);
      try {
        const [todos, actuales] = await Promise.all([
          fetchServicios(),
          fetchServiciosDeBarbero(barbero.id),
        ]);
        setTodosServicios(todos);
        setSeleccionados(new Set(actuales));
      } catch {
        setError("No se pudieron cargar los servicios.");
      } finally {
        setCargandoServicios(false);
      }
    }

    async function cargarHorario() {
      setCargandoHorario(true);
      try {
        setHorarios(await fetchHorariosBarbero(barbero.id));
      } catch {
        setError("No se pudo cargar el horario.");
      } finally {
        setCargandoHorario(false);
      }
    }

    cargarServicios();
    cargarHorario();
  }, [barbero.id]);

  function toggleServicio(id: string) {
    setSeleccionados((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  async function guardarServicios() {
    if (!usuario) return;
    setGuardandoServicios(true);
    try {
      await actualizarServiciosBarbero(usuario.token, barbero.id, Array.from(seleccionados));
    } catch {
      setError("No se pudieron guardar los servicios.");
    } finally {
      setGuardandoServicios(false);
    }
  }

  function actualizarCampoHorario(dia: number, campo: "hora_inicio" | "hora_fin" | "activo", valor: string | boolean) {
    setHorarios((prev) => prev.map((h) => (h.dia_semana === dia ? { ...h, [campo]: valor } : h)));
  }

  async function guardarDia(h: HorarioBarberoDB) {
    if (!usuario) return;
    setGuardandoDia(h.dia_semana);
    try {
      await actualizarHorarioBarbero(usuario.token, barbero.id, {
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        activo: h.activo,
      });
    } catch {
      setError("No se pudo guardar ese día.");
    } finally {
      setGuardandoDia(null);
    }
  }

  return (
    <div className="border-t border-carbon-2 p-4">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setSubTab("servicios")}
          className={`rounded-full px-4 py-1.5 font-body text-xs transition-colors ${
            subTab === "servicios" ? "bg-blanco text-negro" : "bg-carbon text-criss hover:bg-carbon-2"
          }`}
        >
          Servicios
        </button>
        <button
          onClick={() => setSubTab("horario")}
          className={`rounded-full px-4 py-1.5 font-body text-xs transition-colors ${
            subTab === "horario" ? "bg-blanco text-negro" : "bg-carbon text-criss hover:bg-carbon-2"
          }`}
        >
          Horario
        </button>
      </div>

      {error && <p className="mb-3 font-body text-xs text-amarillo">{error}</p>}

      {subTab === "servicios" && (
        <div>
          {cargandoServicios ? (
            <p className="font-body text-xs text-criss">Cargando servicios...</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {todosServicios.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-carbon-2 bg-carbon px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.has(s.id)}
                      onChange={() => toggleServicio(s.id)}
                      className="accent-amarillo"
                    />
                    <span className="font-body text-sm text-blanco">{s.nombre}</span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                disabled={guardandoServicios}
                onClick={guardarServicios}
                className="!px-4 !py-2 text-xs"
              >
                {guardandoServicios ? "Guardando..." : "Guardar servicios"}
              </Button>
            </>
          )}
        </div>
      )}

      {subTab === "horario" && (
        <div>
          {cargandoHorario ? (
            <p className="font-body text-xs text-criss">Cargando horario...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {horarios.map((h) => (
                <div key={h.dia_semana} className="rounded-xl border border-carbon-2 bg-carbon p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-sm uppercase text-blanco">
                      {NOMBRES_DIA[h.dia_semana]}
                    </span>
                    <button
                      type="button"
                      onClick={() => actualizarCampoHorario(h.dia_semana, "activo", !h.activo)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        h.activo ? "bg-amarillo" : "bg-carbon-2"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-negro transition-transform ${
                          h.activo ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {!h.activo ? (
                    <p className="font-body text-xs text-criss">Cerrado este día</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={h.hora_inicio?.slice(0, 5) ?? ""}
                        onChange={(e) => actualizarCampoHorario(h.dia_semana, "hora_inicio", e.target.value)}
                        className="rounded-lg border border-carbon-2 bg-negro px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
                      />
                      <span className="font-body text-xs text-criss">a</span>
                      <input
                        type="time"
                        value={h.hora_fin?.slice(0, 5) ?? ""}
                        onChange={(e) => actualizarCampoHorario(h.dia_semana, "hora_fin", e.target.value)}
                        className="rounded-lg border border-carbon-2 bg-negro px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    disabled={guardandoDia === h.dia_semana}
                    onClick={() => guardarDia(h)}
                    className="mt-3 !px-4 !py-1.5 text-xs"
                  >
                    {guardandoDia === h.dia_semana ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}