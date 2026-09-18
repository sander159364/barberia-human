import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertTriangle, Plus, Pencil, Trash2, Package, Coffee, Boxes, Search } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/Toast";
import {
  fetchProductosCafeteria,
  actualizarProductoCafeteria,
  fetchInsumos,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  type ProductoCafeteriaDB,
  type InsumoDB,
} from "../../lib/adminApi";

type SubTab = "resumen" | "cafeteria" | "insumos";

export function InventarioTab() {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();
  const [subTab, setSubTab] = useState<SubTab>("resumen");

  const [productos, setProductos] = useState<ProductoCafeteriaDB[]>([]);
  const [insumos, setInsumos] = useState<InsumoDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, i] = await Promise.all([fetchProductosCafeteria(), fetchInsumos()]);
      setProductos(p);
      setInsumos(i);
    } catch {
      mostrarError("No se pudo cargar el inventario.");
    } finally {
      setCargando(false);
    }
  }, [mostrarError]);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel("admin-inventario")
      .on("postgres_changes", { event: "*", schema: "public", table: "productos_cafeteria" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "insumos" }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  const alertasCafeteria = productos.filter((p) => p.activo && p.stock_actual <= p.stock_minimo);
  const alertasInsumos = insumos.filter((i) => i.activo && i.stock_actual <= i.stock_minimo);
  const totalAlertas = alertasCafeteria.length + alertasInsumos.length;

  async function ajustarStockCafeteria(p: ProductoCafeteriaDB, delta: number) {
    if (!usuario) return;
    try {
      await actualizarProductoCafeteria(usuario.token, { ...p, stock_actual: p.stock_actual + delta });
    } catch {
      mostrarError("No se pudo ajustar el stock.");
    }
  }

  if (cargando) {
    return <p className="font-body text-sm text-criss">Cargando inventario...</p>;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-blanco">Inventario</h2>
      </div>
      <p className="mb-5 font-body text-xs text-criss">
        Controla el stock de tu cafetería y de tus insumos generales.
      </p>

      {totalAlertas > 0 && (
        <div className="mb-5 rounded-2xl border border-amarillo/30 bg-amarillo/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amarillo" />
            <p className="font-body text-sm font-semibold text-blanco">
              {totalAlertas} producto(s) con stock bajo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertasCafeteria.map((p) => (
              <span key={p.id} className="rounded-full bg-carbon px-3 py-1 font-body text-xs text-blanco">
                <Coffee size={11} className="mr-1 inline" /> {p.nombre} ({p.stock_actual})
              </span>
            ))}
            {alertasInsumos.map((i) => (
              <span key={i.id} className="rounded-full bg-carbon px-3 py-1 font-body text-xs text-blanco">
                <Boxes size={11} className="mr-1 inline" /> {i.nombre} ({i.stock_actual} {i.unidad})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 inline-flex gap-1 rounded-full border border-carbon-2 bg-carbon p-1">
        <button
          onClick={() => setSubTab("resumen")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "resumen" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setSubTab("cafeteria")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "cafeteria" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <Coffee size={14} /> Cafetería
        </button>
        <button
          onClick={() => setSubTab("insumos")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "insumos" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <Boxes size={14} /> Insumos
        </button>
      </div>

      {subTab === "resumen" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-carbon-2 bg-carbon p-4">
            <p className="mb-1 font-body text-[11px] uppercase text-criss">Productos cafetería</p>
            <p className="font-display text-xl text-blanco">{productos.length}</p>
          </div>
          <div className="rounded-xl border border-carbon-2 bg-carbon p-4">
            <p className="mb-1 font-body text-[11px] uppercase text-criss">Insumos registrados</p>
            <p className="font-display text-xl text-blanco">{insumos.length}</p>
          </div>
          <div className="rounded-xl border border-amarillo/30 bg-amarillo/5 p-4">
            <p className="mb-1 font-body text-[11px] uppercase text-criss">Cafetería en alerta</p>
            <p className="font-display text-xl text-amarillo">{alertasCafeteria.length}</p>
          </div>
          <div className="rounded-xl border border-amarillo/30 bg-amarillo/5 p-4">
            <p className="mb-1 font-body text-[11px] uppercase text-criss">Insumos en alerta</p>
            <p className="font-display text-xl text-amarillo">{alertasInsumos.length}</p>
          </div>
        </div>
      )}

      {subTab === "cafeteria" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => {
            const bajo = p.activo && p.stock_actual <= p.stock_minimo;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 ${bajo ? "border-amarillo/40 bg-amarillo/5" : "border-carbon-2 bg-carbon"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display text-sm text-blanco">{p.nombre}</p>
                  {bajo && <AlertTriangle size={14} className="text-amarillo" />}
                </div>
                <p className="mb-3 font-body text-xs text-criss">Mínimo: {p.stock_minimo}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-carbon-2 bg-negro px-1 py-1">
                    <button
                      onClick={() => ajustarStockCafeteria(p, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-blanco hover:bg-carbon-2"
                    >
                      -
                    </button>
                    <span className={`min-w-[2rem] text-center font-display text-sm ${bajo ? "text-amarillo" : "text-blanco"}`}>
                      {p.stock_actual}
                    </span>
                    <button
                      onClick={() => ajustarStockCafeteria(p, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-blanco hover:bg-carbon-2"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {productos.length === 0 && (
            <p className="col-span-full py-10 text-center font-body text-sm text-criss">
              No hay productos de cafetería. Créalos en el tab "Cafetería".
            </p>
          )}
        </div>
      )}

      {subTab === "insumos" && <PanelInsumos insumos={insumos} busqueda={busqueda} setBusqueda={setBusqueda} onCambiado={cargar} />}
    </div>
  );
}

function PanelInsumos({
  insumos,
  busqueda,
  setBusqueda,
  onCambiado,
}: {
  insumos: InsumoDB[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  onCambiado: () => void;
}) {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();

  const [modal, setModal] = useState<"crear" | InsumoDB | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState("unidad");
  const [stockActual, setStockActual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [procesando, setProcesando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<InsumoDB | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return insumos;
    return insumos.filter((i) => i.nombre.toLowerCase().includes(q) || i.categoria?.toLowerCase().includes(q));
  }, [insumos, busqueda]);

  function abrirCrear() {
    setModal("crear");
    setNombre("");
    setCategoria("");
    setUnidad("unidad");
    setStockActual("0");
    setStockMinimo("0");
  }

  function abrirEditar(i: InsumoDB) {
    setModal(i);
    setNombre(i.nombre);
    setCategoria(i.categoria ?? "");
    setUnidad(i.unidad);
    setStockActual(String(i.stock_actual));
    setStockMinimo(String(i.stock_minimo));
  }

  async function guardar() {
    if (!usuario || !nombre.trim()) return;
    setProcesando(true);
    try {
      if (modal === "crear") {
        await crearInsumo(usuario.token, {
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          unidad,
          stockActual: Number(stockActual) || 0,
          stockMinimo: Number(stockMinimo) || 0,
        });
        mostrarExito(`"${nombre}" fue creado.`);
      } else if (modal) {
        await actualizarInsumo(usuario.token, {
          ...modal,
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          unidad,
          stock_actual: Number(stockActual) || 0,
          stock_minimo: Number(stockMinimo) || 0,
        });
        mostrarExito(`"${nombre}" fue actualizado.`);
      }
      setModal(null);
      onCambiado();
    } catch {
      mostrarError("No se pudo guardar el insumo.");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarEliminar() {
    if (!usuario || !porEliminar) return;
    setProcesando(true);
    try {
      await eliminarInsumo(usuario.token, porEliminar.id);
      mostrarExito(`"${porEliminar.nombre}" fue eliminado.`);
      setPorEliminar(null);
      onCambiado();
    } catch {
      mostrarError("No se pudo eliminar el insumo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-criss" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar insumo..."
            className="w-full rounded-lg border border-carbon-2 bg-carbon py-2 pl-9 pr-3 font-body text-sm text-blanco outline-none focus:border-amarillo"
          />
        </div>
        <Button onClick={abrirCrear} className="!px-4 !py-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Nuevo insumo
          </span>
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-carbon-2 py-14 text-center">
          <Package size={26} className="mx-auto mb-3 text-criss" />
          <p className="font-body text-sm text-criss">No hay insumos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((i) => {
            const bajo = i.stock_actual <= i.stock_minimo;
            return (
              <div
                key={i.id}
                className={`rounded-2xl border p-4 ${bajo ? "border-amarillo/40 bg-amarillo/5" : "border-carbon-2 bg-carbon"}`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm text-blanco">{i.nombre}</p>
                    {i.categoria && <p className="font-body text-xs text-criss">{i.categoria}</p>}
                  </div>
                  {bajo && <AlertTriangle size={14} className="shrink-0 text-amarillo" />}
                </div>
                <p className={`mb-3 font-display text-lg ${bajo ? "text-amarillo" : "text-blanco"}`}>
                  {i.stock_actual} <span className="font-body text-xs text-criss">{i.unidad}</span>
                </p>
                <p className="mb-3 font-body text-xs text-criss">Mínimo: {i.stock_minimo} {i.unidad}</p>
                <div className="flex items-center gap-2 border-t border-carbon-2 pt-3">
                  <button
                    onClick={() => abrirEditar(i)}
                    className="flex-1 rounded-lg border border-carbon-2 py-1.5 font-body text-xs text-criss transition-colors hover:border-negro hover:text-negro"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setPorEliminar(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss transition-colors hover:border-red-500 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal abierto={!!modal} onCerrar={() => setModal(null)} titulo={modal === "crear" ? "Nuevo insumo" : "Editar insumo"} ancho="sm">
        <label className="mb-1 block font-body text-xs uppercase text-criss">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Shampoo profesional"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <label className="mb-1 block font-body text-xs uppercase text-criss">Categoría (opcional)</label>
        <input
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Ej. Higiene, herramientas..."
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Stock actual</label>
            <input
              type="number"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Stock mínimo</label>
            <input
              type="number"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
        </div>
        <label className="mb-1 block font-body text-xs uppercase text-criss">Unidad</label>
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="mb-4 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        >
          {["unidad", "botella", "caja", "paquete", "litro", "kg"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <Button type="button" disabled={procesando} onClick={guardar} className="w-full">
          {procesando ? "Guardando..." : "Guardar"}
        </Button>
      </Modal>

      <ConfirmModal
        abierto={!!porEliminar}
        titulo="Eliminar insumo"
        mensaje={porEliminar ? `¿Eliminar "${porEliminar.nombre}"? Esta acción no se puede deshacer.` : ""}
        variante="peligro"
        textoConfirmar="Sí, eliminar"
        procesando={procesando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </div>
  );
}