import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Users, Phone, Cake, PartyPopper } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/Toast";
import {
  fetchClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  type ClienteDB,
} from "../../lib/adminApi";

function diasHastaProximoCumple(fechaISO: string | null): number | null {
  if (!fechaISO) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [, mes, dia] = fechaISO.split("-").map(Number);
  let proximo = new Date(hoy.getFullYear(), mes - 1, dia);
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, mes - 1, dia);
  return Math.round((proximo.getTime() - hoy.getTime()) / 86400000);
}

export function ClientesTab() {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();

  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modal, setModal] = useState<"crear" | ClienteDB | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [celular, setCelular] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<ClienteDB | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setClientes(await fetchClientes());
    } catch {
      mostrarError("No se pudieron cargar los clientes.");
    } finally {
      setCargando(false);
    }
  }, [mostrarError]);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel("admin-clientes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.apellido.toLowerCase().includes(q) ||
        c.celular?.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }, [clientes, busqueda]);

  const cumpleañosProximos = useMemo(() => {
    return clientes
      .map((c) => ({ cliente: c, dias: diasHastaProximoCumple(c.fecha_nacimiento) }))
      .filter((x) => x.dias !== null && x.dias <= 7)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  }, [clientes]);

  function abrirCrear() {
    setModal("crear");
    setNombre("");
    setApellido("");
    setCelular("");
    setFechaNacimiento("");
  }

  function abrirEditar(c: ClienteDB) {
    setModal(c);
    setNombre(c.nombre);
    setApellido(c.apellido);
    setCelular(c.celular ?? "");
    setFechaNacimiento(c.fecha_nacimiento ?? "");
  }

  async function guardar() {
    if (!usuario || !nombre.trim() || !apellido.trim()) {
      mostrarError("Nombre y apellido son obligatorios.");
      return;
    }
    setProcesando(true);
    try {
      if (modal === "crear") {
        await crearCliente(usuario.token, {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          celular: celular.trim(),
          fechaNacimiento: fechaNacimiento || null,
        });
        mostrarExito(`${nombre} ${apellido} fue agregado.`);
      } else if (modal) {
        await actualizarCliente(usuario.token, {
          ...modal,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          celular: celular.trim(),
          fecha_nacimiento: fechaNacimiento || null,
        });
        mostrarExito("Cliente actualizado.");
      }
      setModal(null);
      cargar();
    } catch {
      mostrarError("No se pudo guardar el cliente.");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarEliminar() {
    if (!usuario || !porEliminar) return;
    setProcesando(true);
    try {
      await eliminarCliente(usuario.token, porEliminar.id);
      mostrarExito("Cliente eliminado.");
      setPorEliminar(null);
      cargar();
    } catch {
      mostrarError("No se pudo eliminar el cliente.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return <p className="font-body text-sm text-criss">Cargando clientes...</p>;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-blanco">Clientes</h2>
      </div>
      <p className="mb-5 font-body text-xs text-criss">{clientes.length} cliente(s) registrados</p>

      {cumpleañosProximos.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amarillo/30 bg-amarillo/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <PartyPopper size={16} className="text-amarillo" />
            <p className="font-body text-sm font-semibold text-blanco">Cumpleaños esta semana</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cumpleañosProximos.map(({ cliente, dias }) => (
              <span key={cliente.id} className="flex items-center gap-1 rounded-full bg-carbon px-3 py-1 font-body text-xs text-blanco">
                <Cake size={11} /> {cliente.nombre} {cliente.apellido} · {dias === 0 ? "¡Hoy!" : `en ${dias}d`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-criss" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o celular..."
            className="w-full rounded-lg border border-carbon-2 bg-carbon py-2.5 pl-9 pr-3 font-body text-sm text-blanco outline-none focus:border-amarillo"
          />
        </div>
        <Button onClick={abrirCrear} className="!px-4 !py-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Nuevo cliente
          </span>
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-carbon-2 py-16 text-center">
          <Users size={26} className="mx-auto mb-3 text-criss" />
          <p className="font-body text-sm text-criss">
            {busqueda ? "No hay clientes que coincidan con tu búsqueda." : "Aún no tienes clientes registrados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <div key={c.id} className="rounded-2xl border border-carbon-2 bg-carbon p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-negro text-blanco">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="font-display text-sm text-blanco">{c.nombre} {c.apellido}</p>
                    {c.celular && (
                      <p className="flex items-center gap-1 font-body text-xs text-criss">
                        <Phone size={11} /> {c.celular}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {c.fecha_nacimiento && (
                <p className="mb-3 flex items-center gap-1.5 font-body text-xs text-criss">
                  <Cake size={12} />
                  {new Date(c.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long" })}
                </p>
              )}
              <div className="flex items-center gap-2 border-t border-carbon-2 pt-3">
                <button
                  onClick={() => abrirEditar(c)}
                  className="flex-1 rounded-lg border border-carbon-2 py-1.5 font-body text-xs text-criss transition-colors hover:border-negro hover:text-negro"
                >
                  Editar
                </button>
                <button
                  onClick={() => setPorEliminar(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss transition-colors hover:border-red-500 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal abierto={!!modal} onCerrar={() => setModal(null)} titulo={modal === "crear" ? "Nuevo cliente" : "Editar cliente"} ancho="sm">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Apellido</label>
            <input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
        </div>
        <label className="mb-1 block font-body text-xs uppercase text-criss">Celular</label>
        <input
          type="tel"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          placeholder="987654321"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <label className="mb-1 block font-body text-xs uppercase text-criss">Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          className="mb-4 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <Button type="button" disabled={procesando} onClick={guardar} className="w-full">
          {procesando ? "Guardando..." : "Guardar"}
        </Button>
      </Modal>

      <ConfirmModal
        abierto={!!porEliminar}
        titulo="Eliminar cliente"
        mensaje={porEliminar ? `¿Eliminar a ${porEliminar.nombre} ${porEliminar.apellido}? Esta acción no se puede deshacer.` : ""}
        variante="peligro"
        textoConfirmar="Sí, eliminar"
        procesando={procesando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </div>
  );
}