import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Plus, Pencil, RefreshCw, Shield, FileDown, Users, Mail, Download } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  fetchUsuarios,
  crearUsuario,
  actualizarUsuario,
  fetchMovimientosCajaPorRango,
  MODULOS_DISPONIBLES,
  type UsuarioDB,
} from "../../lib/adminApi";

type SubTab = "usuarios" | "exportar";

export function ConfiguracionTab() {
  const [subTab, setSubTab] = useState<SubTab>("usuarios");

  return (
    <div>
      <h2 className="mb-1 font-display text-lg text-blanco">Configuración</h2>
      <p className="mb-6 font-body text-xs text-criss">
        Administra usuarios del panel y exporta reportes de caja.
      </p>

      <div className="mb-6 inline-flex gap-1 rounded-full border border-carbon-2 bg-carbon p-1">
        <button
          onClick={() => setSubTab("usuarios")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "usuarios" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <Users size={14} /> Usuarios
        </button>
        <button
          onClick={() => setSubTab("exportar")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors sm:text-sm ${
            subTab === "exportar" ? "bg-blanco text-negro shadow-sm" : "text-criss hover:text-blanco"
          }`}
        >
          <FileDown size={14} /> Exportar caja
        </button>
      </div>

      {subTab === "usuarios" && <SeccionUsuarios />}
      {subTab === "exportar" && <SeccionExportarCaja />}
    </div>
  );
}

// ============================================================
// Usuarios
// ============================================================
function SeccionUsuarios() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<"crear" | UsuarioDB | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      setUsuarios(await fetchUsuarios(usuario.token));
      setError(null);
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center gap-2 font-body text-criss">
        <RefreshCw size={16} className="animate-spin" />
        Cargando usuarios...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-body text-xs text-criss">{usuarios.length} usuario(s) con acceso al panel</p>
        <Button className="!px-4 !py-2 gap-2 text-xs sm:text-sm" onClick={() => setModal("crear")}>
          <Plus size={16} /> Nuevo usuario
        </Button>
      </div>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}

      {usuarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-carbon-2 py-16 text-center">
          <Users size={28} className="mx-auto mb-3 text-criss" />
          <p className="font-body text-sm text-criss">Aún no hay usuarios registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-2xl border border-carbon-2 bg-carbon p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-negro font-display text-sm text-blanco">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display text-sm text-blanco">{u.nombre}</p>
                    <p className="flex items-center gap-1 font-body text-xs text-criss">
                      <Mail size={11} /> {u.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold uppercase ${
                    u.activo
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-carbon-2 bg-carbon-2 text-criss"
                  }`}
                >
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-carbon-2 pt-3">
                {u.es_admin ? (
                  <span className="flex items-center gap-1 rounded-full border border-amarillo/40 bg-amarillo/15 px-2.5 py-1 font-body text-[11px] font-semibold text-amarillo">
                    <Shield size={11} /> Administrador · acceso total
                  </span>
                ) : u.modulos.length === 0 ? (
                  <span className="font-body text-xs text-criss">Sin módulos asignados</span>
                ) : (
                  u.modulos.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-carbon-2 bg-carbon-2 px-2.5 py-1 font-body text-[11px] text-criss"
                    >
                      {MODULOS_DISPONIBLES.find((md) => md.id === m)?.label ?? m}
                    </span>
                  ))
                )}
              </div>

              <button
                onClick={() => setModal(u)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-carbon-2 py-2 font-body text-xs text-criss transition-colors hover:border-negro hover:text-negro"
              >
                <Pencil size={13} /> Editar usuario
              </button>
            </div>
          ))}
        </div>
      )}

      <ModalUsuario abierto={!!modal} usuarioEditar={modal !== "crear" ? modal : null} onCerrar={() => setModal(null)} onGuardado={cargar} />
    </div>
  );
}

function ModalUsuario({
  abierto,
  usuarioEditar,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  usuarioEditar: UsuarioDB | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { usuario } = useAuth();
  const esEdicion = !!usuarioEditar;

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado");
  const [esAdmin, setEsAdmin] = useState(false);
  const [modulos, setModulos] = useState<Set<string>>(new Set());
  const [activo, setActivo] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usuarioEditar) {
      setNombre(usuarioEditar.nombre);
      setEmail(usuarioEditar.email);
      setPassword("");
      setRol(usuarioEditar.rol);
      setEsAdmin(usuarioEditar.es_admin);
      setModulos(new Set(usuarioEditar.modulos));
      setActivo(usuarioEditar.activo);
    } else {
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("empleado");
      setEsAdmin(false);
      setModulos(new Set());
      setActivo(true);
    }
    setError(null);
  }, [usuarioEditar, abierto]);

  function toggleModulo(id: string) {
    setModulos((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  async function guardar() {
    if (!usuario) return;
    if (!nombre.trim() || !email.trim()) {
      setError("Completa nombre y correo.");
      return;
    }
    if (!esEdicion && password.trim().length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setProcesando(true);
    try {
      if (esEdicion && usuarioEditar) {
        await actualizarUsuario(usuario.token, {
          id: usuarioEditar.id,
          nombre: nombre.trim(),
          rol,
          esAdmin,
          modulos: Array.from(modulos),
          activo,
          nuevaPassword: password.trim() || undefined,
        });
      } else {
        await crearUsuario(usuario.token, {
          nombre: nombre.trim(),
          email: email.trim(),
          password: password.trim(),
          rol,
          esAdmin,
          modulos: Array.from(modulos),
        });
      }
      onGuardado();
      onCerrar();
    } catch (e: any) {
      setError(e?.message?.includes("correo") ? "Ya existe un usuario con ese correo." : "No se pudo guardar el usuario.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={esEdicion ? "Editar usuario" : "Nuevo usuario"} ancho="md">
      {error && <p className="mb-3 font-body text-xs text-amarillo">{error}</p>}

      <label className="mb-1 block font-body text-xs uppercase text-criss">Nombre</label>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
      />

      <label className="mb-1 block font-body text-xs uppercase text-criss">Correo</label>
      <input
        type="email"
        value={email}
        disabled={esEdicion}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo disabled:opacity-50"
      />

      <label className="mb-1 block font-body text-xs uppercase text-criss">
        {esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={esEdicion ? "Dejar vacío para no cambiarla" : "Mínimo 6 caracteres"}
        className="mb-3 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
      />

      <label className="mb-1 block font-body text-xs uppercase text-criss">Rol (etiqueta)</label>
      <input
        type="text"
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        placeholder="Ej. cajero, recepcionista"
        className="mb-4 w-full rounded-lg border border-carbon-2 bg-carbon px-3 py-2 font-body text-blanco outline-none focus:border-amarillo"
      />

      <div className="mb-4 flex items-center justify-between rounded-lg border border-carbon-2 bg-carbon px-3 py-2.5">
        <div>
          <p className="font-body text-sm text-blanco">Es administrador</p>
          <p className="font-body text-xs text-criss">Acceso total, ignora los módulos de abajo</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={esAdmin}
          onClick={() => setEsAdmin((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${esAdmin ? "bg-amarillo" : "bg-carbon-2"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-negro transition-transform ${
              esAdmin ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {!esAdmin && (
        <div className="mb-4">
          <label className="mb-2 block font-body text-xs uppercase text-criss">Módulos permitidos</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODULOS_DISPONIBLES.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-carbon-2 bg-carbon px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={modulos.has(m.id)}
                  onChange={() => toggleModulo(m.id)}
                  className="accent-amarillo"
                />
                <span className="font-body text-sm text-blanco">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {esEdicion && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-carbon-2 bg-carbon px-3 py-2.5">
          <span className="font-body text-sm text-blanco">Cuenta activa</span>
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            onClick={() => setActivo((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${activo ? "bg-amarillo" : "bg-carbon-2"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-negro transition-transform ${
                activo ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      <Button type="button" disabled={procesando} onClick={guardar} className="w-full">
        {procesando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
      </Button>
    </Modal>
  );
}

// ============================================================
// Exportar caja
// ============================================================
function SeccionExportarCaja() {
  const hoy = new Date().toISOString().split("T")[0];
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function exportar() {
    if (!desde || !hasta) return;
    setGenerando(true);
    setError(null);
    setExito(false);
    try {
      const movimientos = await fetchMovimientosCajaPorRango(desde, hasta);

      if (movimientos.length === 0) {
        setError("No hay movimientos en ese rango de fechas.");
        return;
      }

      const filas = movimientos.map((m) => ({
        Fecha: m.fecha,
        Hora: m.hora,
        Tipo: m.tipo === "ingreso" ? "Ingreso" : "Egreso",
        Origen: m.origen === "reserva" ? "Reserva" : m.origen === "cafeteria" ? "Cafetería" : "Manual",
        Concepto: m.concepto,
        "Método de pago": m.metodo_pago ?? "-",
        Monto: m.monto,
        "Registrado por": m.creado_por ?? "-",
      }));

      const totalIngresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
      const totalEgresos = movimientos.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);

      const hoja = XLSX.utils.json_to_sheet(filas);
      XLSX.utils.sheet_add_aoa(
        hoja,
        [[], ["", "", "", "", "", "Total ingresos", totalIngresos], ["", "", "", "", "", "Total egresos", totalEgresos]],
        { origin: -1 }
      );

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Movimientos");
      XLSX.writeFile(libro, `caja_${desde}_a_${hasta}.xlsx`);
      setExito(true);
    } catch {
      setError("No se pudo generar el reporte.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="max-w-md rounded-2xl border border-carbon-2 bg-carbon p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-negro text-blanco">
          <Download size={18} />
        </div>
        <div>
          <h3 className="font-display text-sm text-blanco">Exportar movimientos</h3>
          <p className="font-body text-xs text-criss">Descarga un reporte en Excel por rango de fechas</p>
        </div>
      </div>

      {error && <p className="mb-4 font-body text-sm text-amarillo">{error}</p>}
      {exito && <p className="mb-4 font-body text-sm text-emerald-600">Reporte descargado correctamente.</p>}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-body text-xs uppercase text-criss">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full rounded-lg border border-carbon-2 bg-carbon-2 px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
          />
        </div>
        <div>
          <label className="mb-1 block font-body text-xs uppercase text-criss">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full rounded-lg border border-carbon-2 bg-carbon-2 px-3 py-2 font-body text-sm text-blanco outline-none focus:border-amarillo"
          />
        </div>
      </div>

      <Button type="button" disabled={generando} onClick={exportar} className="w-full">
        <span className="flex items-center justify-center gap-2">
          <FileDown size={16} />
          {generando ? "Generando..." : "Descargar Excel"}
        </span>
      </Button>
    </div>
  );
}