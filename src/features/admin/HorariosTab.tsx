import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Clock,
  Scissors,
  RefreshCw,
  CalendarOff,
  CalendarCheck2,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/Toast";
import { ImagenConCarga } from "../../components/ui/ImagenConCarga";
import {
  fetchBarberos,
  crearBarbero,
  actualizarBarbero,
  eliminarBarbero,
  subirImagenBarbero,
  fetchServicios,
  fetchServiciosDeBarbero,
  actualizarServiciosBarbero,
  fetchHorariosBarbero,
  actualizarHorarioBarbero,
  type BarberoDB,
  type ServicioDB,
  type HorarioBarberoDB,
} from "../../lib/adminApi";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function parseHora(valor: string | null) {
  if (!valor) return { hora: 9, minuto: 0, meridiano: "AM" as const };
  const [hh, mm] = valor.split(":").map(Number);
  const meridiano: "AM" | "PM" = hh >= 12 ? "PM" : "AM";
  let hora12 = hh % 12;
  if (hora12 === 0) hora12 = 12;
  return { hora: hora12, minuto: mm ?? 0, meridiano };
}

function formatearHora24(hora12: number, minuto: number, meridiano: "AM" | "PM") {
  let hh = hora12 % 12;
  if (meridiano === "PM") hh += 12;
  return `${String(hh).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

// ============================================================
// Switch reutilizable
// ============================================================
function Interruptor({ activo, onCambiar }: { activo: boolean; onCambiar: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={onCambiar}
      className={`relative h-7 w-[52px] shrink-0 rounded-full border-2 transition-colors ${
        activo ? "border-amarillo bg-amarillo" : "border-carbon-2 bg-carbon-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-negro shadow transition-transform ${
          activo ? "translate-x-[26px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ============================================================
// Selector de foto del barbero (mismo patrón que Servicios)
// ============================================================
function SelectorFotoBarbero({
  urlActual,
  onSubido,
}: {
  urlActual: string | null;
  onSubido: (url: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 5MB.");
      return;
    }

    setError(null);
    setSubiendo(true);
    try {
      const url = await subirImagenBarbero(file);
      onSubido(url);
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-carbon-2 bg-negro">
          {subiendo ? (
            <Loader2 size={22} className="animate-spin text-amarillo" />
          ) : urlActual ? (
            <img src={urlActual} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-criss" />
          )}
        </div>
        <label className="cursor-pointer rounded-lg border-2 border-carbon-2 px-4 py-2.5 font-body text-xs font-bold uppercase tracking-wide text-blanco transition-colors hover:border-amarillo hover:text-amarillo">
          {urlActual ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" onChange={manejarArchivo} className="hidden" disabled={subiendo} />
        </label>
      </div>
      {error && <p className="mt-2 font-body text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// Tab principal
// ============================================================
export function HorariosTab() {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();

  const [barberos, setBarberos] = useState<BarberoDB[]>([]);
  const [cargandoBarberos, setCargandoBarberos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barberoActivoId, setBarberoActivoId] = useState<string | null>(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [fotoNueva, setFotoNueva] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargarBarberos = useCallback(async () => {
    setCargandoBarberos(true);
    try {
      const data = await fetchBarberos();
      setBarberos(data);
      setError(null);
      setBarberoActivoId((prev) => {
        if (prev && data.some((b) => b.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch {
      setError("No se pudieron cargar los barberos.");
    } finally {
      setCargandoBarberos(false);
    }
  }, []);

  useEffect(() => {
    cargarBarberos();
    const canal = supabase
      .channel("admin-barberos-tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "barberos" }, () => cargarBarberos())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarBarberos]);

  function abrirModalNuevo() {
    setNombreNuevo("");
    setFotoNueva(null);
    setModalNuevo(true);
  }

  async function handleCrearBarbero() {
    if (!usuario || !nombreNuevo.trim()) return;
    setCreando(true);
    try {
      await crearBarbero(usuario.token, nombreNuevo.trim(), fotoNueva);
      mostrarExito(`"${nombreNuevo.trim()}" fue agregado.`);
      setModalNuevo(false);
      setNombreNuevo("");
      setFotoNueva(null);
      cargarBarberos();
    } catch {
      mostrarError("No se pudo crear el barbero.");
    } finally {
      setCreando(false);
    }
  }

  const barberoActivo = barberos.find((b) => b.id === barberoActivoId) ?? null;

  return (
    <div>
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-blanco">
            Barberos y su horario
          </h2>
          <p className="font-body text-xs text-criss">Un solo rango de "desde" y "hasta" por día.</p>
        </div>
        <Button className="!px-5 !py-2.5 gap-2 text-sm font-bold" onClick={abrirModalNuevo}>
          <Plus size={18} strokeWidth={3} /> Nuevo barbero
        </Button>
      </div>

      {error && <p className="mb-4 mt-4 font-body text-sm font-bold text-red-500">{error}</p>}

      {cargandoBarberos ? (
        <div className="mt-6 flex items-center gap-2 font-body text-criss">
          <RefreshCw size={16} className="animate-spin" />
          Cargando barberos...
        </div>
      ) : barberos.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-carbon-2 py-16 text-center font-body text-sm text-criss">
          Aún no hay barberos registrados. Crea el primero con el botón de arriba.
        </p>
      ) : (
        <>
          <div className="mb-6 mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {barberos.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarberoActivoId(b.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  barberoActivoId === b.id
                    ? "border-amarillo bg-amarillo/10"
                    : "border-carbon-2 bg-carbon-1 hover:border-criss"
                }`}
              >
                <ImagenConCarga
                  url={b.imagen_url}
                  alt={b.nombre}
                  icono={<Scissors size={16} />}
                  className={`h-10 w-10 rounded-full ${
                    barberoActivoId === b.id ? "ring-2 ring-amarillo" : ""
                  }`}
                />
                <span
                  className={`text-center font-body text-xs font-bold ${
                    barberoActivoId === b.id ? "text-blanco" : "text-criss"
                  }`}
                >
                  {b.nombre}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-body text-[9px] font-black uppercase ${
                    b.activo ? "bg-emerald-400/15 text-emerald-400" : "bg-carbon-2 text-neutral-500"
                  }`}
                >
                  {b.activo ? "Activo" : "Inactivo"}
                </span>
              </button>
            ))}
          </div>

          {barberoActivo && <PanelBarbero key={barberoActivo.id} barbero={barberoActivo} onCambiado={cargarBarberos} />}
        </>
      )}

      <Modal abierto={modalNuevo} onCerrar={() => setModalNuevo(false)} titulo="Nuevo barbero" ancho="sm">
        <div className="mb-4">
          <SelectorFotoBarbero urlActual={fotoNueva} onSubido={setFotoNueva} />
        </div>
        <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">Nombre</label>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Ej. Carlos Ramírez"
          className="mb-4 w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
        />
        <Button type="button" disabled={creando} onClick={handleCrearBarbero} className="w-full !py-3 text-sm font-black">
          {creando ? "Creando..." : "Crear barbero"}
        </Button>
      </Modal>
    </div>
  );
}

// ============================================================
// Panel del barbero seleccionado
// ============================================================
function PanelBarbero({ barbero, onCambiado }: { barbero: BarberoDB; onCambiado: () => void }) {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [todosServicios, setTodosServicios] = useState<ServicioDB[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [guardandoServicios, setGuardandoServicios] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargandoServicios(true);
      try {
        const [todos, actuales] = await Promise.all([fetchServicios(), fetchServiciosDeBarbero(barbero.id)]);
        if (!activo) return;
        setTodosServicios(todos);
        setSeleccionados(new Set(actuales));
      } catch {
        if (activo) setError("No se pudieron cargar los servicios.");
      } finally {
        if (activo) setCargandoServicios(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
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
      mostrarExito("Servicios actualizados.");
    } catch {
      mostrarError("No se pudieron guardar los servicios.");
    } finally {
      setGuardandoServicios(false);
    }
  }

  // --- Editar ---
  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(barbero.nombre);
  const [activoEdit, setActivoEdit] = useState(barbero.activo);
  const [fotoEdit, setFotoEdit] = useState<string | null>(barbero.imagen_url);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  function abrirEditar() {
    setNombreEdit(barbero.nombre);
    setActivoEdit(barbero.activo);
    setFotoEdit(barbero.imagen_url);
    setModalEditar(true);
  }

  async function guardarEdicion() {
    if (!usuario || !nombreEdit.trim()) return;
    setGuardandoEdit(true);
    try {
      await actualizarBarbero(usuario.token, {
        id: barbero.id,
        nombre: nombreEdit.trim(),
        activo: activoEdit,
        imagen_url: fotoEdit,
      });
      mostrarExito("Barbero actualizado.");
      setModalEditar(false);
      onCambiado();
    } catch {
      mostrarError("No se pudo actualizar el barbero.");
    } finally {
      setGuardandoEdit(false);
    }
  }

  // --- Eliminar ---
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleEliminar() {
    if (!usuario) return;
    setEliminando(true);
    try {
      await eliminarBarbero(usuario.token, barbero.id);
      mostrarExito(`"${barbero.nombre}" fue eliminado.`);
      setConfirmandoEliminar(false);
      onCambiado();
    } catch {
      mostrarError("No se pudo eliminar el barbero.");
    } finally {
      setEliminando(false);
    }
  }

  const [modalHorario, setModalHorario] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-carbon-2 bg-carbon-1 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 border-b-2 border-carbon-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ImagenConCarga
            url={barbero.imagen_url}
            alt={barbero.nombre}
            icono={<Scissors size={20} />}
            className="h-12 w-12 rounded-full"
          />
          <div>
            <p className="font-display text-lg font-black text-blanco">{barbero.nombre}</p>
            <p className={`font-body text-xs font-bold uppercase ${barbero.activo ? "text-emerald-400" : "text-criss"}`}>
              {barbero.activo ? "Activo" : "Inactivo"}
            </p>
          </div>
        </div>

        {/* Acciones: grid de 3 columnas iguales en móvil, fila en escritorio */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={abrirEditar}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blanco px-2.5 py-2.5 font-body text-xs font-black uppercase tracking-wide text-negro transition-transform hover:scale-[1.02] active:scale-95 sm:px-4"
          >
            <Pencil size={13} strokeWidth={3} /> <span className="hidden xs:inline">Editar</span>
          </button>
          <button
            onClick={() => setModalHorario(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-amarillo px-2.5 py-2.5 font-body text-xs font-black uppercase tracking-wide text-negro transition-transform hover:scale-[1.02] active:scale-95 sm:px-4"
          >
            <Clock size={13} strokeWidth={3} /> <span className="hidden xs:inline">Horario</span>
          </button>
          <button
            onClick={() => setConfirmandoEliminar(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-2.5 text-white transition-transform hover:scale-105 hover:bg-red-500 active:scale-95"
            title="Eliminar barbero"
          >
            <Trash2 size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      {error && <p className="mb-3 font-body text-xs font-bold text-red-500">{error}</p>}

      {/* Servicios que ofrece */}
      <div>
        <h3 className="mb-3 font-display text-sm font-black uppercase tracking-wide text-blanco">
          Servicios que ofrece
        </h3>
        {cargandoServicios ? (
          <p className="font-body text-xs text-criss">Cargando servicios...</p>
        ) : todosServicios.length === 0 ? (
          <p className="font-body text-xs text-criss">No hay servicios creados todavía.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {todosServicios.map((s) => {
                const marcado = seleccionados.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 transition-colors ${
                      marcado ? "border-amarillo bg-amarillo/10" : "border-carbon-2 bg-carbon"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => toggleServicio(s.id)}
                      className="h-4 w-4 accent-amarillo"
                    />
                    <span className={`font-body text-sm font-semibold ${marcado ? "text-blanco" : "text-criss"}`}>
                      {s.nombre}
                    </span>
                  </label>
                );
              })}
            </div>
            <Button
              type="button"
              disabled={guardandoServicios}
              onClick={guardarServicios}
              className="!px-4 !py-2.5 text-xs font-black"
            >
              {guardandoServicios ? "Guardando..." : "Guardar servicios"}
            </Button>
          </>
        )}
      </div>

      {/* Modal: Editar */}
      <Modal abierto={modalEditar} onCerrar={() => setModalEditar(false)} titulo="Editar barbero" ancho="sm">
        <div className="mb-4">
          <SelectorFotoBarbero urlActual={fotoEdit} onSubido={setFotoEdit} />
        </div>
        <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">Nombre</label>
        <input
          type="text"
          value={nombreEdit}
          onChange={(e) => setNombreEdit(e.target.value)}
          className="mb-4 w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
        />
        <div className="mb-5 flex items-center justify-between rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-3">
          <span className="font-body text-sm font-bold text-blanco">Activo</span>
          <Interruptor activo={activoEdit} onCambiar={() => setActivoEdit((v) => !v)} />
        </div>
        <Button type="button" disabled={guardandoEdit} onClick={guardarEdicion} className="w-full !py-3 text-sm font-black">
          {guardandoEdit ? "Guardando..." : "Guardar cambios"}
        </Button>
      </Modal>

      {/* Confirmar eliminación */}
      <ConfirmModal
        abierto={confirmandoEliminar}
        titulo="Eliminar barbero"
        mensaje={`¿Seguro que quieres eliminar a ${barbero.nombre}? Se borrará su horario y sus servicios asignados. Esta acción no se puede deshacer.`}
        variante="peligro"
        textoConfirmar="Sí, eliminar"
        procesando={eliminando}
        onConfirmar={handleEliminar}
        onCancelar={() => setConfirmandoEliminar(false)}
      />

      <ModalHorarioBarbero
        abierto={modalHorario}
        onCerrar={() => setModalHorario(false)}
        barberoId={barbero.id}
        barberoNombre={barbero.nombre}
      />
    </div>
  );
}

// ============================================================
// Modal de horario: barra de días + un solo rango (desde/hasta)
// ============================================================
function ModalHorarioBarbero({
  abierto,
  onCerrar,
  barberoId,
  barberoNombre,
}: {
  abierto: boolean;
  onCerrar: () => void;
  barberoId: string;
  barberoNombre: string;
}) {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();
  const [horarios, setHorarios] = useState<HorarioBarberoDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [diaActivo, setDiaActivo] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    async function cargar() {
      setCargando(true);
      try {
        const data = await fetchHorariosBarbero(barberoId);
        if (activo) setHorarios(data);
      } catch {
        if (activo) setError("No se pudo cargar el horario.");
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [abierto, barberoId]);

  const filaDia = horarios.find((h) => h.dia_semana === diaActivo);

  function actualizarFila(cambios: Partial<HorarioBarberoDB>) {
    setHorarios((prev) => prev.map((h) => (h.dia_semana === diaActivo ? { ...h, ...cambios } : h)));
  }

  function diaTieneAlgo(dia: number) {
    const f = horarios.find((h) => h.dia_semana === dia);
    return !!(f && f.activo && f.hora_inicio && f.hora_fin);
  }

  async function guardarDia() {
    if (!usuario || !filaDia) return;
    setGuardando(true);
    try {
      await actualizarHorarioBarbero(usuario.token, barberoId, {
        dia_semana: filaDia.dia_semana,
        hora_inicio: filaDia.hora_inicio,
        hora_fin: filaDia.hora_fin,
        activo: filaDia.activo,
      });
      mostrarExito(`Horario del ${DIAS[diaActivo]} guardado correctamente.`);
    } catch {
      mostrarError("No se pudo guardar ese día.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Horario de ${barberoNombre}`} ancho="sm">
      {cargando ? (
        <p className="font-body text-sm text-criss">Cargando horario...</p>
      ) : (
        <>
          {error && <p className="mb-3 font-body text-xs font-bold text-red-500">{error}</p>}

          {/* Barra de días: scroll horizontal, nunca se corta */}
          <div className="mb-5 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {DIAS_CORTOS.map((nombre, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDiaActivo(i)}
                className={`flex min-w-[52px] shrink-0 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-colors ${
                  diaActivo === i
                    ? "border-amarillo bg-amarillo/10"
                    : "border-carbon-2 text-criss hover:border-criss"
                }`}
              >
                <span
                  className={`font-body text-xs font-black uppercase ${
                    diaActivo === i ? "text-blanco" : "text-criss"
                  }`}
                >
                  {nombre}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    diaTieneAlgo(i) ? "bg-emerald-400" : "bg-carbon-2"
                  }`}
                />
              </button>
            ))}
          </div>

          {filaDia && (
            <div
              className={`rounded-2xl border-2 p-4 transition-colors ${
                filaDia.activo ? "border-carbon-2 bg-carbon" : "border-carbon-2 bg-carbon/40"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-display text-base font-black uppercase text-blanco">
                  {filaDia.activo ? (
                    <CalendarCheck2 size={16} className="text-emerald-400" />
                  ) : (
                    <CalendarOff size={16} className="text-criss" />
                  )}
                  {DIAS[diaActivo]}
                </span>
                <Interruptor activo={filaDia.activo} onCambiar={() => actualizarFila({ activo: !filaDia.activo })} />
              </div>

              {!filaDia.activo ? (
                <p className="font-body text-xs font-semibold text-neutral-500">Cerrado este día</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block font-body text-[11px] font-bold uppercase tracking-wide text-criss">
                      Desde
                    </label>
                    <SelectorHoraAmPm
                      valor={filaDia.hora_inicio}
                      onCambiar={(v) => actualizarFila({ hora_inicio: v })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-[11px] font-bold uppercase tracking-wide text-criss">
                      Hasta
                    </label>
                    <SelectorHoraAmPm valor={filaDia.hora_fin} onCambiar={(v) => actualizarFila({ hora_fin: v })} />
                    <p className="mt-2 rounded-lg bg-amarillo/10 px-3 py-2 font-body text-[11px] leading-relaxed text-amarillo">
                      Si el horario cruza la medianoche (ej. 7:00 PM a 12:00 AM), pon "Hasta" en{" "}
                      <strong>12:00 AM</strong>, no en 12:00 PM.
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="button"
                disabled={guardando}
                onClick={guardarDia}
                className="mt-5 w-full !py-3 text-sm font-black"
              >
                {guardando ? "Guardando..." : `Guardar ${DIAS[diaActivo]}`}
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function SelectorHoraAmPm({
  valor,
  disabled,
  onCambiar,
}: {
  valor: string | null;
  disabled?: boolean;
  onCambiar: (valor24h: string) => void;
}) {
  const { hora, minuto, meridiano } = parseHora(valor);

  function actualizar(campos: Partial<{ hora: number; minuto: number; meridiano: "AM" | "PM" }>) {
    onCambiar(formatearHora24(campos.hora ?? hora, campos.minuto ?? minuto, campos.meridiano ?? meridiano));
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <select
        value={hora}
        disabled={disabled}
        onChange={(e) => actualizar({ hora: Number(e.target.value) })}
        className="w-full rounded-lg border-2 border-carbon-2 bg-negro px-2 py-2.5 font-body text-sm font-bold text-blanco outline-none focus:border-amarillo disabled:opacity-30"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        value={minuto}
        disabled={disabled}
        onChange={(e) => actualizar({ minuto: Number(e.target.value) })}
        className="w-full rounded-lg border-2 border-carbon-2 bg-negro px-2 py-2.5 font-body text-sm font-bold text-blanco outline-none focus:border-amarillo disabled:opacity-30"
      >
        {[0, 15, 30, 45].map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <div className="flex overflow-hidden rounded-lg border-2 border-carbon-2">
        {(["AM", "PM"] as const).map((mer) => (
          <button
            key={mer}
            type="button"
            disabled={disabled}
            onClick={() => actualizar({ meridiano: mer })}
            className={`flex-1 py-2.5 font-body text-xs font-black transition-colors disabled:opacity-30 ${
              meridiano === mer ? "bg-amarillo text-negro" : "bg-negro text-criss"
            }`}
          >
            {mer}
          </button>
        ))}
      </div>
    </div>
  );
}