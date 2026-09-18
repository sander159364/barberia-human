import { useEffect, useState, useCallback } from "react";
import { Plus, Minus, ShoppingCart, Pencil, Trash2, RefreshCw, Coffee, Package, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  fetchProductosCafeteria,
  crearProductoCafeteria,
  actualizarProductoCafeteria,
  eliminarProductoCafeteria,
  registrarVentaCafeteria,
  type ProductoCafeteriaDB,
} from "../../lib/adminApi";

type MetodoPago = "efectivo" | "yape";
type SubTab = "vender" | "productos";

export function CafeteriaTab() {
  const { usuario } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>("vender");
  const [productos, setProductos] = useState<ProductoCafeteriaDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [carritoMovilAbierto, setCarritoMovilAbierto] = useState(false);

  const [modalCobro, setModalCobro] = useState(false);
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>("efectivo");

  const [modalProducto, setModalProducto] = useState<"crear" | ProductoCafeteriaDB | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formPrecio, setFormPrecio] = useState("");
  const [formStockActual, setFormStockActual] = useState("0");
  const [formStockMinimo, setFormStockMinimo] = useState("0");

  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true);
    else setCargando(true);
    try {
      setProductos(await fetchProductosCafeteria());
      setError(null);
    } catch {
      setError("No se pudieron cargar los productos de cafetería.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel("admin-cafeteria")
      .on("postgres_changes", { event: "*", schema: "public", table: "productos_cafeteria" }, () => cargar(true))
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  const productosActivos = productos.filter((p) => p.activo);

  function agregarAlCarrito(id: string) {
    setCarrito((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function quitarDelCarrito(id: string) {
    setCarrito((prev) => {
      const cant = (prev[id] ?? 0) - 1;
      const copia = { ...prev };
      if (cant <= 0) delete copia[id];
      else copia[id] = cant;
      return copia;
    });
  }
  function vaciarCarrito() {
    setCarrito({});
  }

  const itemsCarrito = Object.entries(carrito)
    .map(([id, cantidad]) => ({ producto: productos.find((p) => p.id === id), cantidad }))
    .filter((i) => i.producto);

  const totalItems = itemsCarrito.reduce((a, i) => a + i.cantidad, 0);
  const totalCarrito = itemsCarrito.reduce(
    (acc, i) => acc + (i.producto ? Number(i.producto.precio) * i.cantidad : 0),
    0
  );

  async function handleCobrarVenta() {
    if (!usuario || itemsCarrito.length === 0) return;
    setProcesando(true);
    try {
      await registrarVentaCafeteria(
        usuario.token,
        itemsCarrito.map((i) => ({ producto_id: i.producto!.id, cantidad: i.cantidad })),
        metodoCobro
      );
      setCarrito({});
      setModalCobro(false);
      setCarritoMovilAbierto(false);
    } catch {
      setError("No se pudo registrar la venta. Verifica que la caja esté abierta.");
    } finally {
      setProcesando(false);
    }
  }

  function abrirModalCrear() {
    setModalProducto("crear");
    setFormNombre("");
    setFormDescripcion("");
    setFormPrecio("");
    setFormStockActual("0");
    setFormStockMinimo("0");
  }

  function abrirModalEditar(p: ProductoCafeteriaDB) {
    setModalProducto(p);
    setFormNombre(p.nombre);
    setFormDescripcion(p.descripcion ?? "");
    setFormPrecio(String(p.precio));
    setFormStockActual(String(p.stock_actual));
    setFormStockMinimo(String(p.stock_minimo));
  }

  async function handleGuardarProducto() {
    if (!usuario) return;
    const precio = parseFloat(formPrecio);
    if (!formNombre.trim() || isNaN(precio) || precio < 0) {
      setError("Completa nombre y precio válidos.");
      return;
    }
    setProcesando(true);
    try {
      if (modalProducto === "crear") {
        await crearProductoCafeteria(usuario.token, {
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim(),
          precio,
          stockActual: Number(formStockActual) || 0,
          stockMinimo: Number(formStockMinimo) || 0,
        });
      } else if (modalProducto) {
        await actualizarProductoCafeteria(usuario.token, {
          ...modalProducto,
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim(),
          precio,
          stock_actual: Number(formStockActual) || 0,
          stock_minimo: Number(formStockMinimo) || 0,
        });
      }
      setModalProducto(null);
      cargar();
    } catch {
      setError("No se pudo guardar el producto.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleEliminarProducto(id: string) {
    if (!usuario) return;
    if (!confirm("¿Eliminar este producto de la cafetería?")) return;
    try {
      await eliminarProductoCafeteria(usuario.token, id);
      cargar();
    } catch {
      setError("No se pudo eliminar el producto.");
    }
  }

  async function handleToggleActivo(p: ProductoCafeteriaDB) {
    if (!usuario) return;
    try {
      await actualizarProductoCafeteria(usuario.token, { ...p, activo: !p.activo });
      cargar();
    } catch {
      setError("No se pudo actualizar el producto.");
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 font-body text-criss">
        <RefreshCw size={16} className="animate-spin" />
        Cargando cafetería...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-blanco">Cafetería</h2>
        {actualizando && (
          <span className="flex items-center gap-1.5 font-body text-xs text-criss">
            <RefreshCw size={12} className="animate-spin" /> Sincronizando
          </span>
        )}
      </div>
      <p className="mb-5 font-body text-xs text-criss">Vende productos y gestiona tu catálogo de cafetería.</p>

      {/* Segmented control */}
      <div className="mb-6 inline-flex gap-1 rounded-full border border-carbon-2 bg-carbon p-1">
        <button
          onClick={() => setSubTab("vender")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "vender" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <ShoppingCart size={14} /> Vender
        </button>
        <button
          onClick={() => setSubTab("productos")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "productos" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <Package size={14} /> Productos
        </button>
      </div>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

      {/* ------------- VENDER ------------- */}
      {subTab === "vender" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Grid de productos */}
          <div>
            {productosActivos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-carbon-2 py-16 text-center">
                <Coffee size={28} className="mx-auto mb-3 text-criss" />
                <p className="font-body text-sm text-criss">
                  No hay productos activos. Agrega alguno en la pestaña "Productos".
                </p>
              </div>
            ) : (
              <div className="mb-24 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mb-0 lg:grid-cols-2 xl:grid-cols-3">
                {productosActivos.map((p) => {
                  const cantidad = carrito[p.id] ?? 0;
                  const sinStock = p.stock_actual <= 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                        cantidad > 0 ? "border-negro bg-carbon" : "border-carbon-2 bg-carbon"
                      } ${sinStock ? "opacity-60" : ""}`}
                    >
                      <div className="mb-3">
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-negro text-blanco">
                          <Coffee size={16} />
                        </div>
                        <p className="font-display text-sm leading-tight text-blanco">{p.nombre}</p>
                        {p.descripcion && (
                          <p className="mt-0.5 line-clamp-2 font-body text-xs text-criss">{p.descripcion}</p>
                        )}
                        {sinStock && (
                          <p className="mt-1 flex items-center gap-1 font-body text-[10px] font-semibold text-amarillo">
                            <AlertTriangle size={10} /> Sin stock
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm text-blanco">S/ {Number(p.precio).toFixed(2)}</span>
                        {cantidad === 0 ? (
                          <button
                            type="button"
                            onClick={() => agregarAlCarrito(p.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-negro text-blanco transition-transform hover:scale-105"
                          >
                            <Plus size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 rounded-full border border-carbon-2 bg-blanco px-1 py-1">
                            <button
                              type="button"
                              onClick={() => quitarDelCarrito(p.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-negro transition-colors hover:bg-carbon-2"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[1rem] text-center font-display text-xs text-negro">
                              {cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => agregarAlCarrito(p.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-negro transition-colors hover:bg-carbon-2"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Carrito fijo en desktop (columna lateral, siempre visible) */}
          <div className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-carbon-2 bg-carbon p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm text-blanco">
                  <ShoppingCart size={16} /> Orden actual
                </h3>
                {itemsCarrito.length > 0 && (
                  <button onClick={vaciarCarrito} className="font-body text-xs text-criss hover:text-amarillo">
                    Vaciar
                  </button>
                )}
              </div>

              {itemsCarrito.length === 0 ? (
                <p className="py-8 text-center font-body text-sm text-criss">Aún no agregas productos.</p>
              ) : (
                <div className="mb-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
                  {itemsCarrito.map((i) => (
                    <div key={i.producto!.id} className="flex items-center justify-between font-body text-sm">
                      <span className="text-blanco">
                        <span className="text-criss">{i.cantidad}×</span> {i.producto!.nombre}
                      </span>
                      <span className="shrink-0 text-blanco">
                        S/ {(Number(i.producto!.precio) * i.cantidad).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-4 flex items-center justify-between border-t border-carbon-2 pt-4 font-display text-base text-blanco">
                <span>Total</span>
                <span>S/ {totalCarrito.toFixed(2)}</span>
              </div>

              <Button
                type="button"
                disabled={itemsCarrito.length === 0}
                onClick={() => {
                  setMetodoCobro("efectivo");
                  setModalCobro(true);
                }}
                className="w-full"
              >
                Cobrar
              </Button>
            </div>
          </div>

          {/* Barra flotante en móvil */}
          {itemsCarrito.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-carbon-2 bg-blanco p-4 shadow-2xl lg:hidden">
              <button
                onClick={() => setCarritoMovilAbierto(true)}
                className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-xl bg-negro px-4 py-3 text-blanco"
              >
                <span className="flex items-center gap-2 font-body text-sm">
                  <ShoppingCart size={16} />
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
                <span className="font-display text-sm">S/ {totalCarrito.toFixed(2)} · Ver orden</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------- PRODUCTOS (CRUD) ------------- */}
      {subTab === "productos" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-body text-xs text-criss">{productos.length} producto(s) en el catálogo</p>
            <Button type="button" onClick={abrirModalCrear} className="!px-4 !py-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Nuevo producto
              </span>
            </Button>
          </div>

          {productos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-carbon-2 py-16 text-center">
              <Package size={28} className="mx-auto mb-3 text-criss" />
              <p className="font-body text-sm text-criss">Aún no hay productos de cafetería.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((p) => {
                const stockBajo = p.stock_actual <= p.stock_minimo;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 transition-opacity ${
                      stockBajo && p.activo ? "border-amarillo/40 bg-amarillo/5" : "border-carbon-2 bg-carbon"
                    } ${!p.activo && "opacity-50"}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-negro text-blanco">
                          <Coffee size={16} />
                        </div>
                        <div>
                          <p className="font-display text-sm leading-tight text-blanco">{p.nombre}</p>
                          <p className="font-body text-xs text-criss">{p.descripcion}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-body text-[10px] font-semibold uppercase ${
                          p.activo ? "bg-emerald-500/15 text-emerald-600" : "bg-carbon-2 text-criss"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <p className="mb-1 font-display text-lg text-blanco">S/ {Number(p.precio).toFixed(2)}</p>
                    <p className={`mb-3 flex items-center gap-1 font-body text-xs ${stockBajo ? "font-semibold text-amarillo" : "text-criss"}`}>
                      {stockBajo && <AlertTriangle size={11} />}
                      Stock: {p.stock_actual} {stockBajo && `(mín. ${p.stock_minimo})`}
                    </p>

                    <div className="flex items-center gap-2 border-t border-carbon-2 pt-3">
                      <button
                        onClick={() => handleToggleActivo(p)}
                        className="flex-1 rounded-lg border border-carbon-2 py-1.5 font-body text-xs text-criss transition-colors hover:border-negro hover:text-negro"
                      >
                        {p.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => abrirModalEditar(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss transition-colors hover:border-negro hover:text-negro"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleEliminarProducto(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-carbon-2 text-criss transition-colors hover:border-amarillo hover:text-amarillo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: crear/editar producto */}
      <Modal
        abierto={!!modalProducto}
        onCerrar={() => setModalProducto(null)}
        titulo={modalProducto === "crear" ? "Nuevo producto" : "Editar producto"}
        ancho="sm"
      >
        <label className="mb-1 block font-body text-xs uppercase text-criss">Nombre</label>
        <input
          type="text"
          value={formNombre}
          onChange={(e) => setFormNombre(e.target.value)}
          placeholder="Ej. Café americano"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <label className="mb-1 block font-body text-xs uppercase text-criss">Descripción</label>
        <input
          type="text"
          value={formDescripcion}
          onChange={(e) => setFormDescripcion(e.target.value)}
          placeholder="Ej. Café negro recién preparado"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <label className="mb-1 block font-body text-xs uppercase text-criss">Precio (S/)</label>
        <input
          type="number"
          inputMode="decimal"
          value={formPrecio}
          onChange={(e) => setFormPrecio(e.target.value)}
          placeholder="0.00"
          className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
        />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Stock actual</label>
            <input
              type="number"
              value={formStockActual}
              onChange={(e) => setFormStockActual(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs uppercase text-criss">Stock mínimo</label>
            <input
              type="number"
              value={formStockMinimo}
              onChange={(e) => setFormStockMinimo(e.target.value)}
              className="w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
            />
          </div>
        </div>
        <Button type="button" disabled={procesando} onClick={handleGuardarProducto} className="w-full">
          {procesando ? "Guardando..." : "Guardar"}
        </Button>
      </Modal>

      {/* Modal: cobrar venta (usado desde desktop) */}
      <Modal abierto={modalCobro} onCerrar={() => setModalCobro(false)} titulo="Cobrar venta" ancho="sm">
        <div className="mb-4 flex flex-col gap-1.5 border-b border-carbon-2 pb-4">
          {itemsCarrito.map((i) => (
            <div key={i.producto!.id} className="flex justify-between font-body text-sm text-criss">
              <span>
                {i.cantidad}x {i.producto!.nombre}
              </span>
              <span className="text-blanco">S/ {(Number(i.producto!.precio) * i.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mb-4 flex justify-between font-display text-base text-blanco">
          <span>Total</span>
          <span>S/ {totalCarrito.toFixed(2)}</span>
        </div>
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
        <Button type="button" disabled={procesando} onClick={handleCobrarVenta} className="w-full">
          {procesando ? "Procesando..." : "Confirmar cobro"}
        </Button>
      </Modal>

      {/* Panel de carrito en móvil (se abre desde la barra flotante) */}
      <Modal
        abierto={carritoMovilAbierto}
        onCerrar={() => setCarritoMovilAbierto(false)}
        titulo="Tu orden"
        ancho="sm"
      >
        {itemsCarrito.length === 0 ? (
          <p className="py-6 text-center font-body text-sm text-criss">El carrito está vacío.</p>
        ) : (
          <>
            <div className="mb-4 flex max-h-72 flex-col gap-3 overflow-y-auto">
              {itemsCarrito.map((i) => (
                <div key={i.producto!.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-body text-sm text-blanco">{i.producto!.nombre}</p>
                    <p className="font-body text-xs text-criss">
                      S/ {Number(i.producto!.precio).toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-carbon-2 px-1 py-1">
                    <button
                      onClick={() => quitarDelCarrito(i.producto!.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-criss hover:bg-carbon-2"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="min-w-[1rem] text-center font-display text-sm text-blanco">
                      {i.cantidad}
                    </span>
                    <button
                      onClick={() => agregarAlCarrito(i.producto!.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-criss hover:bg-carbon-2"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between border-t border-carbon-2 pt-4 font-display text-base text-blanco">
              <span>Total</span>
              <span>S/ {totalCarrito.toFixed(2)}</span>
            </div>

            <Button
              type="button"
              onClick={() => {
                setCarritoMovilAbierto(false);
                setMetodoCobro("efectivo");
                setModalCobro(true);
              }}
              className="w-full"
            >
              Ir a cobrar
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}