import { supabase } from "./supabaseClient";

export interface ServicioDB {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
  imagen_url: string | null;
}

export interface HorarioDB {
  id: string;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: boolean;
}

export interface CitaDB {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string | null;
  servicio_id: string | null;
  barbero_id: string | null;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmada" | "completada" | "cancelada";
  estado_pago: "pendiente" | "pagado";
  metodo_pago: "efectivo" | "yape" | null;
  creado_en: string;
  servicios?: { nombre: string; precio: number } | null;
  barberos?: { nombre: string } | null;
}

export interface ProductoCafeteriaDB {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
  orden: number;
}

export interface CajaSesionDB {
  id: string;
  monto_inicial: number;
  monto_final_esperado: number | null;
  monto_final_real: number | null;
  diferencia: number | null;
  estado: "abierta" | "cerrada";
  abierta_por: string | null;
  cerrada_por: string | null;
  abierta_en: string;
  cerrada_en: string | null;
}

export interface CajaMovimientoDB {
  id: string;
  sesion_id: string;
  tipo: "ingreso" | "egreso";
  origen: "reserva" | "cafeteria" | "manual";
  reserva_id: string | null;
  concepto: string;
  metodo_pago: "efectivo" | "yape" | null;
  monto: number;
  creado_por: string | null;
  creado_en: string;
}

export async function fetchCitas() {
  const { data, error } = await supabase
    .from("reservas")
    .select("*, servicios(nombre, precio), barberos(nombre)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });
  if (error) throw error;
  return data as CitaDB[];
}

export async function actualizarEstadoCita(token: string, citaId: string, estado: string) {
  const { error } = await supabase.rpc("actualizar_estado_cita", {
    p_token: token,
    p_cita_id: citaId,
    p_estado: estado,
  });
  if (error) throw error;
}

export async function fetchServicios() {
  const { data, error } = await supabase.from("servicios").select("*").order("orden");
  if (error) throw error;
  return data as ServicioDB[];
}

export async function subirImagenServicio(file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("servicios")
    .upload(nombreArchivo, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("servicios").getPublicUrl(nombreArchivo);
  return data.publicUrl;
}

export async function crearServicio(
  token: string,
  servicio: { nombre: string; descripcion: string; duracion_min: number; precio: number; imagen_url?: string | null }
) {
  const { data, error } = await supabase.rpc("crear_servicio", {
    p_token: token,
    p_nombre: servicio.nombre,
    p_descripcion: servicio.descripcion,
    p_duracion_min: servicio.duracion_min,
    p_precio: servicio.precio,
    p_imagen_url: servicio.imagen_url ?? null,
  });
  if (error) throw error;
  return data as ServicioDB;
}

export async function actualizarServicio(token: string, servicio: ServicioDB) {
  const { error } = await supabase.rpc("actualizar_servicio", {
    p_token: token,
    p_id: servicio.id,
    p_nombre: servicio.nombre,
    p_descripcion: servicio.descripcion,
    p_duracion_min: servicio.duracion_min,
    p_precio: servicio.precio,
    p_activo: servicio.activo,
    p_imagen_url: servicio.imagen_url,
  });
  if (error) throw error;
}

export async function eliminarServicio(token: string, id: string) {
  const { error } = await supabase.rpc("eliminar_servicio", { p_token: token, p_id: id });
  if (error) throw error;
}

export async function fetchHorarios() {
  const { data, error } = await supabase.from("horarios").select("*").order("dia_semana");
  if (error) throw error;
  return data as HorarioDB[];
}

export async function actualizarHorario(token: string, horario: HorarioDB) {
  const { error } = await supabase.rpc("actualizar_horario", {
    p_token: token,
    p_dia_semana: horario.dia_semana,
    p_hora_inicio: horario.hora_inicio,
    p_hora_fin: horario.hora_fin,
    p_activo: horario.activo,
  });
  if (error) throw error;
}

// ---------------- CAFETERÍA ----------------

export async function fetchProductosCafeteria() {
  const { data, error } = await supabase
    .from("productos_cafeteria")
    .select("*")
    .order("orden");
  if (error) throw error;
  return data as ProductoCafeteriaDB[];
}

export async function crearProductoCafeteria(
  token: string,
  producto: { nombre: string; descripcion: string; precio: number }
) {
  const { data, error } = await supabase.rpc("crear_producto_cafeteria", {
    p_token: token,
    p_nombre: producto.nombre,
    p_descripcion: producto.descripcion,
    p_precio: producto.precio,
  });
  if (error) throw error;
  return data as ProductoCafeteriaDB;
}

export async function actualizarProductoCafeteria(token: string, producto: ProductoCafeteriaDB) {
  const { error } = await supabase.rpc("actualizar_producto_cafeteria", {
    p_token: token,
    p_id: producto.id,
    p_nombre: producto.nombre,
    p_descripcion: producto.descripcion,
    p_precio: producto.precio,
    p_activo: producto.activo,
  });
  if (error) throw error;
}

export async function eliminarProductoCafeteria(token: string, id: string) {
  const { error } = await supabase.rpc("eliminar_producto_cafeteria", { p_token: token, p_id: id });
  if (error) throw error;
}

// ---------------- CAJA ----------------

export async function fetchCajaSesionActiva() {
  const { data, error } = await supabase
    .from("caja_sesiones")
    .select("*")
    .eq("estado", "abierta")
    .maybeSingle();
  if (error) throw error;
  return data as CajaSesionDB | null;
}

export async function fetchMovimientosCaja(sesionId: string) {
  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("*")
    .eq("sesion_id", sesionId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data as CajaMovimientoDB[];
}

export async function abrirCaja(token: string, montoInicial: number) {
  const { data, error } = await supabase.rpc("abrir_caja", {
    p_token: token,
    p_monto_inicial: montoInicial,
  });
  if (error) throw error;
  return data as CajaSesionDB;
}

export async function cerrarCaja(token: string, montoFinalReal: number) {
  const { data, error } = await supabase.rpc("cerrar_caja", {
    p_token: token,
    p_monto_final_real: montoFinalReal,
  });
  if (error) throw error;
  return data as CajaSesionDB;
}

export async function fetchReservasPendientesDePago() {
  const { data, error } = await supabase
    .from("reservas")
    .select("*, servicios(nombre, precio), barberos(nombre)")
    .eq("estado_pago", "pendiente")
    .neq("estado", "cancelada")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });
  if (error) throw error;
  return data as CitaDB[];
}

export async function registrarMovimientoManual(
  token: string,
  tipo: "ingreso" | "egreso",
  concepto: string,
  monto: number,
  metodoPago?: "efectivo" | "yape"
) {
  const { error } = await supabase.rpc("registrar_movimiento_manual", {
    p_token: token,
    p_tipo: tipo,
    p_concepto: concepto,
    p_monto: monto,
    p_metodo_pago: metodoPago ?? null,
  });
  if (error) throw error;
}

export async function registrarPagoReserva(
  token: string,
  reservaId: string,
  metodoPago: "efectivo" | "yape"
) {
  const { error } = await supabase.rpc("marcar_reserva_pagada", {
    p_token: token,
    p_reserva_id: reservaId,
    p_metodo_pago: metodoPago,
  });
  if (error) throw error;
}

export async function registrarVentaCafeteria(
  token: string,
  items: { producto_id: string; cantidad: number }[],
  metodoPago: "efectivo" | "yape"
) {
  const { error } = await supabase.rpc("registrar_venta_cafeteria", {
    p_token: token,
    p_items: items,
    p_metodo_pago: metodoPago,
  });
  if (error) throw error;
}

// ---------------- BARBEROS ----------------

export interface BarberoDB {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface HorarioBarberoDB {
  id: string;
  barbero_id: string;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: boolean;
}

export async function fetchBarberos() {
  const { data, error } = await supabase.from("barberos").select("*").order("orden");
  if (error) throw error;
  return data as BarberoDB[];
}

export async function crearBarbero(token: string, nombre: string) {
  const { data, error } = await supabase.rpc("crear_barbero", { p_token: token, p_nombre: nombre });
  if (error) throw error;
  return data as BarberoDB;
}

export async function actualizarBarbero(token: string, barbero: { id: string; nombre: string; activo: boolean }) {
  const { error } = await supabase.rpc("actualizar_barbero", {
    p_token: token,
    p_id: barbero.id,
    p_nombre: barbero.nombre,
    p_activo: barbero.activo,
  });
  if (error) throw error;
}

export async function eliminarBarbero(token: string, id: string) {
  const { error } = await supabase.rpc("eliminar_barbero", { p_token: token, p_id: id });
  if (error) throw error;
}

export async function fetchServiciosDeBarbero(barberoId: string) {
  const { data, error } = await supabase
    .from("servicios_barberos")
    .select("servicio_id")
    .eq("barbero_id", barberoId);
  if (error) throw error;
  return (data ?? []).map((r) => r.servicio_id as string);
}

export async function actualizarServiciosBarbero(token: string, barberoId: string, servicioIds: string[]) {
  const { error } = await supabase.rpc("actualizar_servicios_barbero", {
    p_token: token,
    p_barbero_id: barberoId,
    p_servicio_ids: servicioIds,
  });
  if (error) throw error;
}

export async function fetchHorariosBarbero(barberoId: string) {
  const { data, error } = await supabase
    .from("horarios_barbero")
    .select("*")
    .eq("barbero_id", barberoId)
    .order("dia_semana");
  if (error) throw error;
  return data as HorarioBarberoDB[];
}

export async function actualizarHorarioBarbero(
  token: string,
  barberoId: string,
  horario: { dia_semana: number; hora_inicio: string | null; hora_fin: string | null; activo: boolean }
) {
  const { error } = await supabase.rpc("actualizar_horario_barbero", {
    p_token: token,
    p_barbero_id: barberoId,
    p_dia_semana: horario.dia_semana,
    p_hora_inicio: horario.hora_inicio,
    p_hora_fin: horario.hora_fin,
    p_activo: horario.activo,
  });
  if (error) throw error;
}

// ---------------- USUARIOS / CONFIGURACIÓN ----------------

export interface UsuarioDB {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  es_admin: boolean;
  modulos: string[];
  activo: boolean;
  creado_en: string;
}

export const MODULOS_DISPONIBLES = [
  { id: "reservas", label: "Reservas" },
  { id: "servicios", label: "Servicios" },
  { id: "horarios", label: "Barberos y horarios" },
  { id: "cafeteria", label: "Cafetería" },
  { id: "caja", label: "Caja" },
] as const;

export async function fetchUsuarios(token: string) {
  const { data, error } = await supabase.rpc("listar_usuarios", { p_token: token });
  if (error) throw error;
  return data as UsuarioDB[];
}

export async function crearUsuario(
  token: string,
  usuario: { nombre: string; email: string; password: string; rol: string; esAdmin: boolean; modulos: string[] }
) {
  const { error } = await supabase.rpc("crear_usuario", {
    p_token: token,
    p_nombre: usuario.nombre,
    p_email: usuario.email,
    p_password: usuario.password,
    p_rol: usuario.rol,
    p_es_admin: usuario.esAdmin,
    p_modulos: usuario.modulos,
  });
  if (error) throw error;
}

export async function actualizarUsuario(
  token: string,
  usuario: {
    id: string;
    nombre: string;
    rol: string;
    esAdmin: boolean;
    modulos: string[];
    activo: boolean;
    nuevaPassword?: string;
  }
) {
  const { error } = await supabase.rpc("actualizar_usuario", {
    p_token: token,
    p_id: usuario.id,
    p_nombre: usuario.nombre,
    p_rol: usuario.rol,
    p_es_admin: usuario.esAdmin,
    p_modulos: usuario.modulos,
    p_activo: usuario.activo,
    p_nueva_password: usuario.nuevaPassword?.trim() || null,
  });
  if (error) throw error;
}

// ---------------- EXPORTAR CAJA ----------------

export interface MovimientoExportDB {
  fecha: string;
  hora: string;
  tipo: "ingreso" | "egreso";
  origen: "reserva" | "cafeteria" | "manual";
  concepto: string;
  metodo_pago: string | null;
  monto: number;
  creado_por: string | null;
}

export async function fetchMovimientosCajaPorRango(fechaInicio: string, fechaFin: string) {
  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("*")
    .gte("creado_en", `${fechaInicio}T00:00:00`)
    .lte("creado_en", `${fechaFin}T23:59:59`)
    .order("creado_en", { ascending: true });

  if (error) throw error;

  return (data as CajaMovimientoDB[]).map((m) => {
    const fechaObj = new Date(m.creado_en);
    return {
      fecha: fechaObj.toLocaleDateString("es-PE"),
      hora: fechaObj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      tipo: m.tipo,
      origen: m.origen,
      concepto: m.concepto,
      metodo_pago: m.metodo_pago,
      monto: Number(m.monto),
      creado_por: m.creado_por,
    } as MovimientoExportDB;
  });
}
export async function guardarPushSubscription(
  token: string,
  sub: { endpoint: string; p256dh: string; auth: string }
) {
  const { error } = await supabase.rpc("guardar_push_subscription", {
    p_token: token,
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
  });
  if (error) throw error;
}

export async function eliminarPushSubscription(token: string, endpoint: string) {
  const { error } = await supabase.rpc("eliminar_push_subscription", {
    p_token: token,
    p_endpoint: endpoint,
  });
  if (error) throw error;
}