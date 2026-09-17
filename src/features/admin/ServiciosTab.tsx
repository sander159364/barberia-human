import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Clock, ImagePlus, Loader2, Pencil, Search, Scissors, Power } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/Toast";
import {
  fetchServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
  subirImagenServicio,
  type ServicioDB,
} from "../../lib/adminApi";

const VACIO = { nombre: "", descripcion: "", duracion_min: 30, precio: 0, imagen_url: null as string | null };

// ============================================================
// Selector de imagen reutilizado dentro del modal
// ============================================================
function SelectorImagen({
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
      const url = await subirImagenServicio(file);
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
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-carbon-2 bg-negro">
          {subiendo ? (
            <Loader2 size={22} className="animate-spin text-amarillo" />
          ) : urlActual ? (
            <img src={urlActual} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-criss" />
          )}
        </div>
        <label className="cursor-pointer rounded-lg border-2 border-carbon-2 px-4 py-2.5 font-body text-xs font-bold uppercase tracking-wide text-blanco transition-colors hover:border-amarillo hover:text-amarillo">
          {urlActual ? "Cambiar imagen" : "Subir imagen"}
          <input type="file" accept="image/*" onChange={manejarArchivo} className="hidden" disabled={subiendo} />
        </label>
      </div>
      {error && <p className="mt-2 font-body text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

export function ServiciosTab() {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();

  const [servicios, setServicios] = useState<ServicioDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [modalForm, setModalForm] = useState<"crear" | ServicioDB | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  const [porEliminar, setPorEliminar] = useState<ServicioDB | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setServicios(await fetchServicios());
      setError(null);
    } catch {
      setError("No se pudieron cargar los servicios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const serviciosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return servicios;
    return servicios.filter(
      (s) => s.nombre.toLowerCase().includes(q) || s.descripcion?.toLowerCase().includes(q)
    );
  }, [servicios, busqueda]);

  const stats = useMemo(() => {
    const activos = servicios.filter((s) => s.activo).length;
    const precioPromedio = servicios.length
      ? servicios.reduce((acc, s) => acc + Number(s.precio), 0) / servicios.length
      : 0;
    const masCaro = servicios.reduce((max, s) => (Number(s.precio) > Number(max?.precio ?? 0) ? s : max), null as ServicioDB | null);
    return { activos, precioPromedio, masCaro };
  }, [servicios]);

  function abrirCrear() {
    setForm(VACIO);
    setModalForm("crear");
  }

  function abrirEditar(s: ServicioDB) {
    setForm({
      nombre: s.nombre,
      descripcion: s.descripcion ?? "",
      duracion_min: s.duracion_min,
      precio: Number(s.precio),
      imagen_url: s.imagen_url,
    });
    setModalForm(s);
  }

  async function guardar() {
    if (!usuario || !form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      if (modalForm === "crear") {
        await crearServicio(usuario.token, form);
        mostrarExito(`"${form.nombre}" fue creado.`);
      } else if (modalForm) {
        await actualizarServicio(usuario.token, { ...modalForm, ...form });
        mostrarExito(`"${form.nombre}" fue actualizado.`);
      }
      setModalForm(null);
      cargar();
    } catch {
      mostrarError("No se pudo guardar el servicio.");
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(s: ServicioDB) {
    if (!usuario) return;
    try {
      await actualizarServicio(usuario.token, { ...s, activo: !s.activo });
      mostrarExito(`"${s.nombre}" ahora está ${!s.activo ? "activo" : "inactivo"}.`);
      cargar();
    } catch {
      mostrarError("No se pudo actualizar el servicio.");
    }
  }

  async function confirmarEliminar() {
    if (!usuario || !porEliminar) return;
    setEliminando(true);
    try {
      await eliminarServicio(usuario.token, porEliminar.id);
      mostrarExito(`"${porEliminar.nombre}" fue eliminado.`);
      setPorEliminar(null);
      cargar();
    } catch {
      mostrarError("No se pudo eliminar el servicio.");
    } finally {
      setEliminando(false);
    }
  }

  if (cargando) {
    return <p className="font-body text-criss">Cargando servicios...</p>;
  }

  return (
    <div>
      {/* ==================== HEADER ==================== */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-blanco">Servicios</h2>
          <p className="font-body text-xs text-criss">{servicios.length} servicio(s) en total</p>
        </div>
        <Button className="!px-5 !py-2.5 gap-2 text-sm font-bold" onClick={abrirCrear}>
          <Plus size={18} strokeWidth={3} /> Nuevo servicio
        </Button>
      </div>

      {/* ==================== STATS FUERTES ==================== */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-carbon-2 bg-carbon-1 p-4">
          <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-wide text-criss">Activos</p>
          <p className="font-display text-2xl font-black text-emerald-400">{stats.activos}</p>
        </div>
        <div className="rounded-xl border-2 border-carbon-2 bg-carbon-1 p-4">
          <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-wide text-criss">Precio promedio</p>
          <p className="font-display text-2xl font-black text-amarillo">S/ {stats.precioPromedio.toFixed(0)}</p>
        </div>
        <div className="col-span-2 rounded-xl border-2 border-carbon-2 bg-carbon-1 p-4 sm:col-span-1">
          <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-wide text-criss">Más caro</p>
          <p className="truncate font-display text-lg font-black text-blanco">
            {stats.masCaro?.nombre ?? "—"}
          </p>
        </div>
      </div>

      {/* ==================== BUSCADOR ==================== */}
      <div className="relative mb-5">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-criss" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar servicio por nombre o descripción..."
          className="w-full rounded-xl border-2 border-carbon-2 bg-carbon-1 py-3 pl-11 pr-4 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
        />
      </div>

      {error && <p className="mb-4 font-body text-sm font-bold text-red-500">{error}</p>}

      {/* ==================== GRID DE SERVICIOS ==================== */}
      {serviciosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-carbon-2 py-16 text-center">
          <Scissors size={26} className="text-criss" />
          <p className="font-body text-criss">
            {busqueda ? "No hay servicios que coincidan con tu búsqueda." : "Aún no tienes servicios creados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviciosFiltrados.map((s) => (
            <div
              key={s.id}
              className={`group overflow-hidden rounded-2xl border-2 bg-carbon-1 transition-all ${
                s.activo ? "border-carbon-2 hover:border-amarillo/60" : "border-carbon-2 opacity-60"
              }`}
            >
              {/* Imagen */}
              <div className="relative h-36 w-full bg-negro">
                {s.imagen_url ? (
                  <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Scissors size={28} className="text-carbon-2" />
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2.5 py-1 font-body text-[10px] font-black uppercase tracking-wide ${
                    s.activo ? "bg-emerald-400 text-negro" : "bg-carbon-2 text-criss"
                  }`}
                >
                  {s.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="mb-1 font-display text-base font-black uppercase leading-tight text-blanco">
                  {s.nombre}
                </h3>
                <p className="mb-3 line-clamp-2 font-body text-xs text-criss">{s.descripcion || "Sin descripción"}</p>

                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-body text-xs font-bold text-criss">
                    <Clock size={13} /> {s.duracion_min} min
                  </span>
                  <span className="font-display text-xl font-black text-amarillo">S/ {Number(s.precio).toFixed(0)}</span>
                </div>

                {/* Acciones — colores fuertes */}
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEditar(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blanco py-2.5 font-body text-xs font-black uppercase tracking-wide text-negro transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <Pencil size={13} strokeWidth={3} /> Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(s)}
                    title={s.activo ? "Desactivar" : "Activar"}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold transition-transform hover:scale-105 active:scale-95 ${
                      s.activo ? "bg-carbon-2 text-criss" : "bg-emerald-500 text-negro"
                    }`}
                  >
                    <Power size={15} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setPorEliminar(s)}
                    title="Eliminar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition-transform hover:scale-105 hover:bg-red-500 active:scale-95"
                  >
                    <Trash2 size={15} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODAL: crear/editar ==================== */}
      <Modal
        abierto={!!modalForm}
        onCerrar={() => setModalForm(null)}
        titulo={modalForm === "crear" ? "Nuevo servicio" : "Editar servicio"}
        ancho="md"
      >
        <div className="mb-4">
          <SelectorImagen urlActual={form.imagen_url} onSubido={(url) => setForm({ ...form, imagen_url: url })} />
        </div>

        <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">Nombre</label>
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej. Corte clásico"
          className="mb-3 w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
        />

        <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">Descripción</label>
        <input
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej. Corte con máquina y tijera, incluye lavado"
          className="mb-3 w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
        />

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">
              Duración (min)
            </label>
            <input
              type="number"
              value={form.duracion_min}
              onChange={(e) => setForm({ ...form, duracion_min: Number(e.target.value) })}
              className="w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-medium text-blanco outline-none focus:border-amarillo"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs font-bold uppercase tracking-wide text-criss">
              Precio (S/)
            </label>
            <input
              type="number"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
              className="w-full rounded-lg border-2 border-carbon-2 bg-carbon px-3 py-2.5 font-body text-sm font-black text-amarillo outline-none focus:border-amarillo"
            />
          </div>
        </div>

        <Button type="button" disabled={guardando} onClick={guardar} className="w-full !py-3 text-sm font-black">
          {guardando ? "Guardando..." : modalForm === "crear" ? "Crear servicio" : "Guardar cambios"}
        </Button>
      </Modal>

      {/* ==================== CONFIRMAR ELIMINACIÓN ==================== */}
      <ConfirmModal
        abierto={!!porEliminar}
        titulo="Eliminar servicio"
        mensaje={
          porEliminar
            ? `¿Seguro que quieres eliminar "${porEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ""
        }
        variante="peligro"
        textoConfirmar="Sí, eliminar"
        procesando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </div>
  );
}