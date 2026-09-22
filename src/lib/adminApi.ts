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
  stock_actual: number;
  stock_minimo: number;
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

// ============================================================
// RESERVAS / CITAS
// ============================================================

export async function fetchCitas() {
  const { data, error } = await supabase
    .from("reservas")
    .select("*, servicios(nombre, precio), barberos(nombre)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) throw error;

  return data as CitaDB[];
}

export async function actualizarEstadoCita(
  token: string,
  citaId: string,
  estado: string
) {
  const { error } = await supabase.rpc("actualizar_estado_cita", {
    p_token: token,
    p_cita_id: citaId,
    p_estado: estado,
  });

  if (error) throw error;
}

// ============================================================
// SERVICIOS
// ============================================================

export async function fetchServicios() {
  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .order("orden");

  if (error) throw error;

  return data as ServicioDB[];
}

export async function subirImagenServicio(file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("servicios")
    .upload(nombreArchivo, file, {
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("servicios")
    .getPublicUrl(nombreArchivo);

  return data.publicUrl;
}

export async function crearServicio(
  token: string,
  servicio: {
    nombre: string;
    descripcion: string;
    duracion_min: number;
    precio: number;
    imagen_url?: string | null;
  }
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

export async function actualizarServicio(
  token: string,
  servicio: ServicioDB
) {
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

export async function eliminarServicio(
  token: string,
  id: string
) {
  const { error } = await supabase.rpc("eliminar_servicio", {
    p_token: token,
    p_id: id,
  });

  if (error) throw error;
}

// ============================================================
// HORARIOS
// ============================================================

export async function fetchHorarios() {
  const { data, error } = await supabase
    .from("horarios")
    .select("*")
    .order("dia_semana");

  if (error) throw error;

  return data as HorarioDB[];
}

export async function actualizarHorario(
  token: string,
  horario: HorarioDB
) {
  const { error } = await supabase.rpc("actualizar_horario", {
    p_token: token,
    p_dia_semana: horario.dia_semana,
    p_hora_inicio: horario.hora_inicio,
    p_hora_fin: horario.hora_fin,
    p_activo: horario.activo,
  });

  if (error) throw error;
}

// ============================================================
// CAFETERÍA
// ============================================================

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
  producto: {
    nombre: string;
    descripcion: string;
    precio: number;
    stockActual?: number;
    stockMinimo?: number;
  }
) {
  const { data, error } = await supabase.rpc(
    "crear_producto_cafeteria",
    {
      p_token: token,
      p_nombre: producto.nombre,
      p_descripcion: producto.descripcion,
      p_precio: producto.precio,
      p_stock_actual: producto.stockActual ?? 0,
      p_stock_minimo: producto.stockMinimo ?? 0,
    }
  );

  if (error) throw error;

  return data as ProductoCafeteriaDB;
}

export async function actualizarProductoCafeteria(
  token: string,
  producto: ProductoCafeteriaDB
) {
  const { error } = await supabase.rpc(
    "actualizar_producto_cafeteria",
    {
      p_token: token,
      p_id: producto.id,
      p_nombre: producto.nombre,
      p_descripcion: producto.descripcion,
      p_precio: producto.precio,
      p_activo: producto.activo,
      p_stock_actual: producto.stock_actual,
      p_stock_minimo: producto.stock_minimo,
    }
  );

  if (error) throw error;
}

export async function eliminarProductoCafeteria(
  token: string,
  id: string
) {
  const { error } = await supabase.rpc(
    "eliminar_producto_cafeteria",
    {
      p_token: token,
      p_id: id,
    }
  );

  if (error) throw error;
}

// ============================================================
// CAJA
// ============================================================

export async function fetchCajaSesionActiva() {
  const { data, error } = await supabase
    .from("caja_sesiones")
    .select("*")
    .eq("estado", "abierta")
    .maybeSingle();

  if (error) throw error;

  return data as CajaSesionDB | null;
}

export async function fetchMovimientosCaja(
  sesionId: string
) {
  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("*")
    .eq("sesion_id", sesionId)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  return data as CajaMovimientoDB[];
}

export async function abrirCaja(
  token: string,
  montoInicial: number
) {
  const { data, error } = await supabase.rpc("abrir_caja", {
    p_token: token,
    p_monto_inicial: montoInicial,
  });

  if (error) throw error;

  return data as CajaSesionDB;
}

export async function cerrarCaja(
  token: string,
  montoFinalReal: number
) {
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
  const { error } = await supabase.rpc(
    "registrar_movimiento_manual",
    {
      p_token: token,
      p_tipo: tipo,
      p_concepto: concepto,
      p_monto: monto,
      p_metodo_pago: metodoPago ?? null,
    }
  );

  if (error) throw error;
}

export async function registrarPagoReserva(
  token: string,
  reservaId: string,
  metodoPago: "efectivo" | "yape"
) {
  const { error } = await supabase.rpc(
    "marcar_reserva_pagada",
    {
      p_token: token,
      p_reserva_id: reservaId,
      p_metodo_pago: metodoPago,
    }
  );

  if (error) throw error;
}

export async function registrarVentaCafeteria(
  token: string,
  items: {
    producto_id: string;
    cantidad: number;
  }[],
  metodoPago: "efectivo" | "yape"
) {
  const { error } = await supabase.rpc(
    "registrar_venta_cafeteria",
    {
      p_token: token,
      p_items: items,
      p_metodo_pago: metodoPago,
    }
  );

  if (error) throw error;
}

// ============================================================
// BARBEROS
// ============================================================

export interface BarberoDB {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
  imagen_url: string | null;
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
  const { data, error } = await supabase
    .from("barberos")
    .select("*")
    .order("orden");

  if (error) throw error;

  return data as BarberoDB[];
}

export async function subirImagenBarbero(
  file: File
): Promise<string> {
  const extension = file.name.split(".").pop();
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("barberos")
    .upload(nombreArchivo, file, {
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("barberos")
    .getPublicUrl(nombreArchivo);

  return data.publicUrl;
}

export async function crearBarbero(
  token: string,
  nombre: string,
  imagenUrl?: string | null
) {
  const { data, error } = await supabase.rpc(
    "crear_barbero",
    {
      p_token: token,
      p_nombre: nombre,
      p_imagen_url: imagenUrl ?? null,
    }
  );

  if (error) throw error;

  return data as BarberoDB;
}

export async function actualizarBarbero(
  token: string,
  barbero: {
    id: string;
    nombre: string;
    activo: boolean;
    imagen_url?: string | null;
  }
) {
  const { error } = await supabase.rpc(
    "actualizar_barbero",
    {
      p_token: token,
      p_id: barbero.id,
      p_nombre: barbero.nombre,
      p_activo: barbero.activo,
      p_imagen_url: barbero.imagen_url ?? null,
    }
  );

  if (error) throw error;
}

export async function eliminarBarbero(
  token: string,
  id: string
) {
  const { error } = await supabase.rpc(
    "eliminar_barbero",
    {
      p_token: token,
      p_id: id,
    }
  );

  if (error) throw error;
}

export async function fetchServiciosDeBarbero(
  barberoId: string
) {
  const { data, error } = await supabase
    .from("servicios_barberos")
    .select("servicio_id")
    .eq("barbero_id", barberoId);

  if (error) throw error;

  return (data ?? []).map(
    (r) => r.servicio_id as string
  );
}

export async function actualizarServiciosBarbero(
  token: string,
  barberoId: string,
  servicioIds: string[]
) {
  const { error } = await supabase.rpc(
    "actualizar_servicios_barbero",
    {
      p_token: token,
      p_barbero_id: barberoId,
      p_servicio_ids: servicioIds,
    }
  );

  if (error) throw error;
}

export async function fetchHorariosBarbero(
  barberoId: string
) {
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
  horario: {
    dia_semana: number;
    hora_inicio: string | null;
    hora_fin: string | null;
    activo: boolean;
  }
) {
  const { error } = await supabase.rpc(
    "actualizar_horario_barbero",
    {
      p_token: token,
      p_barbero_id: barberoId,
      p_dia_semana: horario.dia_semana,
      p_hora_inicio: horario.hora_inicio,
      p_hora_fin: horario.hora_fin,
      p_activo: horario.activo,
    }
  );

  if (error) throw error;
}

// ============================================================
// USUARIOS / CONFIGURACIÓN
// ============================================================

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
  { id: "inventario", label: "Inventario" },
  { id: "clientes", label: "Clientes" },
  { id: "caja", label: "Caja" },
] as const;

export async function fetchUsuarios(token: string) {
  const { data, error } = await supabase.rpc(
    "listar_usuarios",
    {
      p_token: token,
    }
  );

  if (error) throw error;

  return data as UsuarioDB[];
}

export async function crearUsuario(
  token: string,
  usuario: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    esAdmin: boolean;
    modulos: string[];
  }
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
  const { error } = await supabase.rpc(
    "actualizar_usuario",
    {
      p_token: token,
      p_id: usuario.id,
      p_nombre: usuario.nombre,
      p_rol: usuario.rol,
      p_es_admin: usuario.esAdmin,
      p_modulos: usuario.modulos,
      p_activo: usuario.activo,
      p_nueva_password:
        usuario.nuevaPassword?.trim() || null,
    }
  );

  if (error) throw error;
}

// ============================================================
// EXPORTAR CAJA
// ============================================================

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

export async function fetchMovimientosCajaPorRango(
  fechaInicio: string,
  fechaFin: string
) {
  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("*")
    .gte(
      "creado_en",
      `${fechaInicio}T00:00:00`
    )
    .lte(
      "creado_en",
      `${fechaFin}T23:59:59`
    )
    .order("creado_en", {
      ascending: true,
    });

  if (error) throw error;

  return (data as CajaMovimientoDB[]).map((m) => {
    const fechaObj = new Date(m.creado_en);

    return {
      fecha: fechaObj.toLocaleDateString("es-PE"),
      hora: fechaObj.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tipo: m.tipo,
      origen: m.origen,
      concepto: m.concepto,
      metodo_pago: m.metodo_pago,
      monto: Number(m.monto),
      creado_por: m.creado_por,
    } as MovimientoExportDB;
  });
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

export async function guardarPushSubscription(
  token: string,
  sub: {
    endpoint: string;
    p256dh: string;
    auth: string;
  }
) {
  const { error } = await supabase.rpc(
    "guardar_push_subscription",
    {
      p_token: token,
      p_endpoint: sub.endpoint,
      p_p256dh: sub.p256dh,
      p_auth: sub.auth,
    }
  );

  if (error) throw error;
}

export async function eliminarPushSubscription(
  token: string,
  endpoint: string
) {
  const { error } = await supabase.rpc(
    "eliminar_push_subscription",
    {
      p_token: token,
      p_endpoint: endpoint,
    }
  );

  if (error) throw error;
}

// ============================================================
// INVENTARIO: INSUMOS
// ============================================================

export interface InsumoDB {
  id: string;
  nombre: string;
  categoria: string | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  creado_en: string;
}

export async function fetchInsumos() {
  const { data, error } = await supabase
    .from("insumos")
    .select("*")
    .order("nombre");

  if (error) throw error;

  return data as InsumoDB[];
}

export async function crearInsumo(
  token: string,
  insumo: {
    nombre: string;
    categoria: string;
    unidad: string;
    stockActual: number;
    stockMinimo: number;
  }
) {
  const { data, error } = await supabase.rpc(
    "crear_insumo",
    {
      p_token: token,
      p_nombre: insumo.nombre,
      p_categoria: insumo.categoria || null,
      p_unidad: insumo.unidad,
      p_stock_actual: insumo.stockActual,
      p_stock_minimo: insumo.stockMinimo,
    }
  );

  if (error) throw error;

  return data as InsumoDB;
}

export async function actualizarInsumo(
  token: string,
  insumo: InsumoDB
) {
  const { error } = await supabase.rpc(
    "actualizar_insumo",
    {
      p_token: token,
      p_id: insumo.id,
      p_nombre: insumo.nombre,
      p_categoria: insumo.categoria,
      p_unidad: insumo.unidad,
      p_stock_actual: insumo.stock_actual,
      p_stock_minimo: insumo.stock_minimo,
      p_activo: insumo.activo,
    }
  );

  if (error) throw error;
}

export async function eliminarInsumo(
  token: string,
  id: string
) {
  const { error } = await supabase.rpc(
    "eliminar_insumo",
    {
      p_token: token,
      p_id: id,
    }
  );

  if (error) throw error;
}

// ============================================================
// CLIENTES
// ============================================================

export type TipoDocumento = "dni" | "ruc";

// ============================================================
// RUC - TRABAJADORES
// ============================================================

export interface TrabajadorRUC {
  numPensionista: string;
  numPrestadoresServicio: string;
  numTrabajadores: string;
  periodo: string;
}

// ============================================================
// RUC - REPRESENTANTES
// ============================================================

export interface RepresentanteRUC {
  cargo: string;
  fechaDesde: string;
  nombre: string;
  numDocumento: string;
  tipDocumento: string;
}

// ============================================================
// RUC - HISTÓRICO
// ============================================================

export interface HistoricoRUC {
  condiciones: Record<string, unknown>[];

  bajas: {
    fechaBaja: string;
    razonSocial: string;
  }[];
}

// ============================================================
// CLIENTE DB
// ============================================================

export interface ClienteDB {
  id: string;

  tipo_documento: TipoDocumento;

  nombre: string | null;
  apellido: string | null;

  celular: string | null;

  fecha_nacimiento: string | null;

  creado_en: string;

  // ==========================================================
  // DNI
  // ==========================================================

  dni: string | null;

  dig_ruc: string | null;

  apellido_paterno: string | null;

  apellido_materno: string | null;

  nombre_completo: string | null;

  direccion: string | null;

  ubigeo: string | null;

  ubigeo_nacimiento: string | null;

  ubigeo_direccion: string | null;

  sexo: string | null;

  estado_civil: string | null;

  madre: string | null;

  padre: string | null;

  // ==========================================================
  // RUC
  // ==========================================================

  ruc: string | null;

  razon_social: string | null;

  nombre_comercial: string | null;

  tipo_contribuyente: string | null;

  estado_ruc: string | null;

  condicion_ruc: string | null;

  domicilio_fiscal: string | null;

  fecha_inscripcion: string | null;

  actividad_economica: string | null;

  sistema_contabilidad: string | null;

  afiliado_ple: string | null;

  emisor_electronico: string | null;

  comprobantes_electronicos: string | null;

  padrones: string | null;

  cant_trabajadores: TrabajadorRUC[] | null;

  representantes: RepresentanteRUC[] | null;

  historico: HistoricoRUC | null;
}

// ============================================================
// RESPUESTA DNI
// ============================================================

export interface DatosDNI {
  dni: string;

  dig_ruc: string | null;

  apellido_paterno: string;

  apellido_materno: string;

  nombres: string;

  nombre_completo: string;

  fecha_nacimiento: string | null;

  ubigeo_nacimiento: string | null;

  ubigeo_direccion: string | null;

  direccion: string;

  sexo: string | null;

  estado_civil: string | null;

  madre: string | null;

  padre: string | null;
}

// ============================================================
// RESPUESTA RUC
// ============================================================

export interface DatosRUC {
  ruc: string;

  razon_social: string;

  nombre_comercial: string;

  tipo_contribuyente: string;

  estado: string;

  condicion: string;

  domicilio_fiscal: string;

  fecha_inscripcion: string;

  actividad_economica: string;

  sistema_contabilidad: string;

  afiliado_ple: string;

  emisor_electronico: string;

  comprobantes_electronicos: string;

  padrones: string;

  cant_trabajadores: TrabajadorRUC[];

  representantes: RepresentanteRUC[];

  historico: HistoricoRUC;
}

// ============================================================
// LISTAR CLIENTES
// ============================================================

export async function fetchClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("creado_en", {
      ascending: false,
    });

  if (error) throw error;

  return data as ClienteDB[];
}

// ============================================================
// BUSCAR CLIENTE POR DOCUMENTO
//
// IMPORTANTE:
// Esta función se ejecuta ANTES de consultar la API.
// ============================================================

export async function buscarClientePorDocumento(
  tipo: TipoDocumento,
  numero: string
): Promise<ClienteDB | null> {
  const columna = tipo === "dni" ? "dni" : "ruc";

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq(columna, numero)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data as ClienteDB | null;
}

// ============================================================
// CONSULTAR DNI
// ============================================================

export async function consultarDni(
  dni: string
): Promise<DatosDNI> {
  const dniLimpio = dni.replace(/\D/g, "");

  if (!/^\d{8}$/.test(dniLimpio)) {
    throw new Error(
      "El DNI debe contener exactamente 8 dígitos."
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      "consultar-dni",
      {
        body: {
          dni: dniLimpio,
        },
      }
    );

  if (error) throw error;

  if (!data?.encontrado || !data?.cliente) {
    throw new Error(
      data?.error ||
        "No se encontró información para ese DNI."
    );
  }

  return data.cliente as DatosDNI;
}

// ============================================================
// CONSULTAR RUC
// ============================================================

export async function consultarRuc(
  ruc: string
): Promise<DatosRUC> {
  const rucLimpio = ruc.replace(/\D/g, "");

  if (!/^\d{11}$/.test(rucLimpio)) {
    throw new Error(
      "El RUC debe contener exactamente 11 dígitos."
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      "consultar-ruc",
      {
        body: {
          ruc: rucLimpio,
        },
      }
    );

  if (error) throw error;

  if (!data?.encontrado || !data?.empresa) {
    throw new Error(
      data?.error ||
        "No se encontró información para ese RUC."
    );
  }

  return data.empresa as DatosRUC;
}

// ============================================================
// CONVERTIR FECHA DNI
// DD/MM/YYYY → YYYY-MM-DD
// ============================================================

export function convertirFechaDNI(
  fecha: string | null
): string | null {
  if (!fecha) return null;

  const partes = fecha.split("/");

  if (partes.length !== 3) {
    return null;
  }

  const [dia, mes, anio] = partes;

  if (!dia || !mes || !anio) {
    return null;
  }

  return `${anio}-${mes.padStart(
    2,
    "0"
  )}-${dia.padStart(2, "0")}`;
}

// ============================================================
// DATOS PARA CREAR / ACTUALIZAR
// ============================================================

export interface DatosClienteFormulario {
  tipoDocumento: TipoDocumento;

  // ==========================================================
  // COMUNES
  // ==========================================================

  nombre: string;

  apellido: string;

  celular: string;

  fechaNacimiento: string | null;

  direccion?: string | null;

  // ==========================================================
  // DNI
  // ==========================================================

  dni?: string | null;

  digRuc?: string | null;

  apellidoPaterno?: string | null;

  apellidoMaterno?: string | null;

  nombreCompleto?: string | null;

  ubigeo?: string | null;

  ubigeoNacimiento?: string | null;

  ubigeoDireccion?: string | null;

  sexo?: string | null;

  estadoCivil?: string | null;

  madre?: string | null;

  padre?: string | null;

  // ==========================================================
  // RUC
  // ==========================================================

  ruc?: string | null;

  razonSocial?: string | null;

  nombreComercial?: string | null;

  tipoContribuyente?: string | null;

  estadoRuc?: string | null;

  condicionRuc?: string | null;

  domicilioFiscal?: string | null;

  fechaInscripcion?: string | null;

  actividadEconomica?: string | null;

  sistemaContabilidad?: string | null;

  afiliadoPle?: string | null;

  emisorElectronico?: string | null;

  comprobantesElectronicos?: string | null;

  padrones?: string | null;

  cantTrabajadores?: TrabajadorRUC[] | null;

  representantes?: RepresentanteRUC[] | null;

  historico?: HistoricoRUC | null;
}

// ============================================================
// CREAR CLIENTE
// ============================================================

export async function crearCliente(
  token: string,
  c: DatosClienteFormulario
) {
  const { data, error } = await supabase.rpc(
    "crear_cliente",
    {
      p_token: token,

      p_tipo_documento:
        c.tipoDocumento,

      p_nombre:
        c.nombre || null,

      p_apellido:
        c.apellido || null,

      p_celular:
        c.celular || null,

      p_fecha_nacimiento:
        c.fechaNacimiento || null,

      // DNI
      p_dni:
        c.dni || null,

      p_dig_ruc:
        c.digRuc || null,

      p_apellido_paterno:
        c.apellidoPaterno || null,

      p_apellido_materno:
        c.apellidoMaterno || null,

      p_nombre_completo:
        c.nombreCompleto || null,

      p_direccion:
        c.direccion || null,

      p_ubigeo:
        c.ubigeo || null,

      p_ubigeo_nacimiento:
        c.ubigeoNacimiento || null,

      p_ubigeo_direccion:
        c.ubigeoDireccion || null,

      p_sexo:
        c.sexo || null,

      p_estado_civil:
        c.estadoCivil || null,

      p_madre:
        c.madre || null,

      p_padre:
        c.padre || null,

      // RUC
      p_ruc:
        c.ruc || null,

      p_razon_social:
        c.razonSocial || null,

      p_nombre_comercial:
        c.nombreComercial || null,

      p_tipo_contribuyente:
        c.tipoContribuyente || null,

      p_estado_ruc:
        c.estadoRuc || null,

      p_condicion_ruc:
        c.condicionRuc || null,

      p_domicilio_fiscal:
        c.domicilioFiscal || null,

      p_fecha_inscripcion:
        c.fechaInscripcion || null,

      p_actividad_economica:
        c.actividadEconomica || null,

      p_sistema_contabilidad:
        c.sistemaContabilidad || null,

      p_afiliado_ple:
        c.afiliadoPle || null,

      p_emisor_electronico:
        c.emisorElectronico || null,

      p_comprobantes_electronicos:
        c.comprobantesElectronicos || null,

      p_padrones:
        c.padrones || null,

      p_cant_trabajadores:
        c.cantTrabajadores || [],

      p_representantes:
        c.representantes || [],

      p_historico:
        c.historico || null,
    }
  );

  if (error) throw error;

  return data as ClienteDB;
}

// ============================================================
// ACTUALIZAR CLIENTE
// ============================================================

export async function actualizarCliente(
  token: string,
  id: string,
  c: DatosClienteFormulario
) {
  const { error } = await supabase.rpc(
    "actualizar_cliente",
    {
      p_token: token,

      p_id: id,

      p_tipo_documento:
        c.tipoDocumento,

      p_nombre:
        c.nombre || null,

      p_apellido:
        c.apellido || null,

      p_celular:
        c.celular || null,

      p_fecha_nacimiento:
        c.fechaNacimiento || null,

      // DNI
      p_dni:
        c.dni || null,

      p_dig_ruc:
        c.digRuc || null,

      p_apellido_paterno:
        c.apellidoPaterno || null,

      p_apellido_materno:
        c.apellidoMaterno || null,

      p_nombre_completo:
        c.nombreCompleto || null,

      p_direccion:
        c.direccion || null,

      p_ubigeo:
        c.ubigeo || null,

      p_ubigeo_nacimiento:
        c.ubigeoNacimiento || null,

      p_ubigeo_direccion:
        c.ubigeoDireccion || null,

      p_sexo:
        c.sexo || null,

      p_estado_civil:
        c.estadoCivil || null,

      p_madre:
        c.madre || null,

      p_padre:
        c.padre || null,

      // RUC
      p_ruc:
        c.ruc || null,

      p_razon_social:
        c.razonSocial || null,

      p_nombre_comercial:
        c.nombreComercial || null,

      p_tipo_contribuyente:
        c.tipoContribuyente || null,

      p_estado_ruc:
        c.estadoRuc || null,

      p_condicion_ruc:
        c.condicionRuc || null,

      p_domicilio_fiscal:
        c.domicilioFiscal || null,

      p_fecha_inscripcion:
        c.fechaInscripcion || null,

      p_actividad_economica:
        c.actividadEconomica || null,

      p_sistema_contabilidad:
        c.sistemaContabilidad || null,

      p_afiliado_ple:
        c.afiliadoPle || null,

      p_emisor_electronico:
        c.emisorElectronico || null,

      p_comprobantes_electronicos:
        c.comprobantesElectronicos || null,

      p_padrones:
        c.padrones || null,

      p_cant_trabajadores:
        c.cantTrabajadores || [],

      p_representantes:
        c.representantes || [],

      p_historico:
        c.historico || null,
    }
  );

  if (error) throw error;
}

// ============================================================
// ELIMINAR CLIENTE
// ============================================================

export async function eliminarCliente(
  token: string,
  id: string
) {
  const { error } = await supabase.rpc(
    "eliminar_cliente",
    {
      p_token: token,
      p_id: id,
    }
  );

  if (error) throw error;
}