import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  User,
  Building2,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  BriefcaseBusiness,
  History,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  actualizarCliente,
  buscarClientePorDocumento,
  consultarDni,
  consultarRuc,
  crearCliente,
  eliminarCliente,
  fetchClientes,
  type ClienteDB,
  type DatosDNI,
  type DatosRUC,
} from "../../lib/adminApi";

type TipoDocumento = "DNI" | "RUC";

interface TrabajadorRUC {
  numPensionista: string;
  numPrestadoresServicio: string;
  numTrabajadores: string;
  periodo: string;
}

interface RepresentanteRUC {
  cargo: string;
  fechaDesde: string;
  nombre: string;
  numDocumento: string;
  tipDocumento: string;
}

interface BajaHistoricaRUC {
  fechaBaja: string;
  razonSocial: string;
}

interface HistoricoRUC {
  condiciones: unknown[];
  bajas: BajaHistoricaRUC[];
}

interface DatosClienteFormulario {
  tipoDocumento: TipoDocumento;
  numeroDoc: string;

  // Datos generales
  nombre: string;
  apellido: string;
  celular: string;
  fechaNacimiento: string;

  // DNI
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  digRuc: string;
  ubigeoNacimiento: string;
  ubigeoDireccion: string;
  direccion: string;
  sexo: string;
  estadoCivil: string;
  madre: string;
  padre: string;

  // RUC
  razonSocial: string;
  nombreComercial: string;
  tipoContribuyente: string;
  estadoRuc: string;
  condicionRuc: string;
  fechaInscripcion: string;
  actividadEconomica: string;
  sistemaContabilidad: string;
  afiliadoPle: string;
  emisorElectronico: string;
  comprobantesElectronicos: string;
  padrones: string;

  cantTrabajadores: TrabajadorRUC[];
  representantes: RepresentanteRUC[];
  historico: HistoricoRUC | null;
}

const formularioInicial: DatosClienteFormulario = {
  tipoDocumento: "DNI",
  numeroDoc: "",

  nombre: "",
  apellido: "",
  celular: "",
  fechaNacimiento: "",

  apellidoPaterno: "",
  apellidoMaterno: "",
  nombreCompleto: "",
  digRuc: "",
  ubigeoNacimiento: "",
  ubigeoDireccion: "",
  direccion: "",
  sexo: "",
  estadoCivil: "",
  madre: "",
  padre: "",

  razonSocial: "",
  nombreComercial: "",
  tipoContribuyente: "",
  estadoRuc: "",
  condicionRuc: "",
  fechaInscripcion: "",
  actividadEconomica: "",
  sistemaContabilidad: "",
  afiliadoPle: "",
  emisorElectronico: "",
  comprobantesElectronicos: "",
  padrones: "",

  cantTrabajadores: [],
  representantes: [],
  historico: null,
};

function convertirFechaDNI(fecha: string | null | undefined): string {
  if (!fecha) return "";

  const limpia = fecha.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
    return limpia;
  }

  const partes = limpia.split("/");

  if (partes.length !== 3) {
    return limpia;
  }

  const [dia, mes, anio] = partes;

  if (!dia || !mes || !anio) {
    return limpia;
  }

  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "-";

  const limpia = fecha.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpia)) {
    return limpia;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
    const [anio, mes, dia] = limpia.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return limpia;
}

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor);
}

function normalizarTrabajadores(
  valor: unknown
): TrabajadorRUC[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.map((item: any) => ({
    numPensionista: textoSeguro(item?.numPensionista),
    numPrestadoresServicio: textoSeguro(item?.numPrestadoresServicio),
    numTrabajadores: textoSeguro(item?.numTrabajadores),
    periodo: textoSeguro(item?.periodo),
  }));
}

function normalizarRepresentantes(
  valor: unknown
): RepresentanteRUC[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.map((item: any) => ({
    cargo: textoSeguro(item?.cargo),
    fechaDesde: textoSeguro(item?.fechaDesde),
    nombre: textoSeguro(item?.nombre),
    numDocumento: textoSeguro(item?.numDocumento),
    tipDocumento: textoSeguro(item?.tipDocumento),
  }));
}

function normalizarHistorico(valor: unknown): HistoricoRUC | null {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  const data = valor as any;

  return {
    condiciones: Array.isArray(data.condiciones)
      ? data.condiciones
      : [],
    bajas: Array.isArray(data.bajas)
      ? data.bajas.map((item: any) => ({
          fechaBaja: textoSeguro(item?.fechaBaja),
          razonSocial: textoSeguro(item?.razonSocial),
        }))
      : [],
  };
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 ${
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-500"
            : "focus:border-black focus:ring-2 focus:ring-black/5"
        }`}
      />
    </div>
  );
}

function CampoGrande({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/5"
      />
    </div>
  );
}

export function ClientesTab() {
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasoModal, setPasoModal] = useState<TipoDocumento>("DNI");

  const [modoEdicion, setModoEdicion] = useState<ClienteDB | null>(
    null
  );

  const [formulario, setFormulario] =
    useState<DatosClienteFormulario>(formularioInicial);

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    try {
      setCargando(true);

      const data = await fetchClientes();

      setClientes(data ?? []);
    } catch (error) {
      console.error("Error cargando clientes:", error);

      setMensajeError(
        "No se pudieron cargar los clientes."
      );
    } finally {
      setCargando(false);
    }
  }

  function limpiarMensajes() {
    setMensajeExito("");
    setMensajeError("");
  }

  function limpiarFormulario() {
    setFormulario({
      ...formularioInicial,
      tipoDocumento: pasoModal,
    });

    setModoEdicion(null);
    setConfirmarEliminar(false);
    limpiarMensajes();
  }

  function abrirCrear() {
    limpiarMensajes();

    setModoEdicion(null);

    setPasoModal("DNI");

    setFormulario({
      ...formularioInicial,
      tipoDocumento: "DNI",
    });

    setConfirmarEliminar(false);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando || buscando || eliminando) {
      return;
    }

    setModalAbierto(false);
    limpiarFormulario();
  }

  function cambiarTipoDocumento(tipo: TipoDocumento) {
    if (modoEdicion) {
      return;
    }

    limpiarMensajes();

    setPasoModal(tipo);

    setFormulario({
      ...formularioInicial,
      tipoDocumento: tipo,
    });
  }

  function actualizarCampo(
    campo: keyof DatosClienteFormulario,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function cargarClienteEnFormulario(cliente: ClienteDB) {
    const tipo: TipoDocumento =
      cliente.tipo_documento === "RUC" ? "RUC" : "DNI";

    const trabajadores = normalizarTrabajadores(
      (cliente as any).cant_trabajadores
    );

    const representantes = normalizarRepresentantes(
      (cliente as any).representantes
    );

    const historico = normalizarHistorico(
      (cliente as any).historico
    );

    setPasoModal(tipo);

    setFormulario({
      tipoDocumento: tipo,
      numeroDoc:
        tipo === "RUC"
          ? textoSeguro((cliente as any).ruc)
          : textoSeguro((cliente as any).dni),

      nombre: textoSeguro(cliente.nombre),
      apellido: textoSeguro(cliente.apellido),
      celular: textoSeguro(cliente.celular),
      fechaNacimiento: convertirFechaDNI(
        textoSeguro(cliente.fecha_nacimiento)
      ),

      apellidoPaterno: textoSeguro(
        (cliente as any).apellido_paterno
      ),
      apellidoMaterno: textoSeguro(
        (cliente as any).apellido_materno
      ),
      nombreCompleto: textoSeguro(
        (cliente as any).nombre_completo
      ),
      digRuc: textoSeguro((cliente as any).dig_ruc),

      ubigeoNacimiento: textoSeguro(
        (cliente as any).ubigeo_nacimiento
      ),
      ubigeoDireccion: textoSeguro(
        (cliente as any).ubigeo_direccion ?? cliente.ubigeo
      ),

      direccion: textoSeguro(cliente.direccion),

      sexo: textoSeguro((cliente as any).sexo),
      estadoCivil: textoSeguro(
        (cliente as any).estado_civil
      ),
      madre: textoSeguro((cliente as any).madre),
      padre: textoSeguro((cliente as any).padre),

      razonSocial: textoSeguro(cliente.razon_social),
      nombreComercial: textoSeguro(
        cliente.nombre_comercial
      ),
      tipoContribuyente: textoSeguro(
        (cliente as any).tipo_contribuyente
      ),
      estadoRuc: textoSeguro(cliente.estado_ruc),
      condicionRuc: textoSeguro(cliente.condicion_ruc),

      fechaInscripcion: textoSeguro(
        (cliente as any).fecha_inscripcion
      ),
      actividadEconomica: textoSeguro(
        (cliente as any).actividad_economica
      ),
      sistemaContabilidad: textoSeguro(
        (cliente as any).sistema_contabilidad
      ),
      afiliadoPle: textoSeguro(
        (cliente as any).afiliado_ple
      ),
      emisorElectronico: textoSeguro(
        (cliente as any).emisor_electronico
      ),
      comprobantesElectronicos: textoSeguro(
        (cliente as any).comprobantes_electronicos
      ),
      padrones: textoSeguro((cliente as any).padrones),

      cantTrabajadores: trabajadores,
      representantes,
      historico,
    });

    setModoEdicion(cliente);
    setModalAbierto(true);
  }

  function abrirEditar(cliente: ClienteDB) {
    limpiarMensajes();

    cargarClienteEnFormulario(cliente);

    setMensajeExito(
      "Cliente cargado. Puedes revisar y editar sus datos."
    );
  }

  async function buscar() {
    limpiarMensajes();

    const limpio = formulario.numeroDoc.replace(/\D/g, "");

    const longitudEsperada =
      pasoModal === "DNI" ? 8 : 11;

    if (limpio.length !== longitudEsperada) {
      setMensajeError(
        pasoModal === "DNI"
          ? "El DNI debe tener 8 dígitos."
          : "El RUC debe tener 11 dígitos."
      );

      return;
    }

    try {
      setBuscando(true);

      /*
       * ============================================================
       * 1. PRIMERO BUSCAMOS EN NUESTRA BASE DE DATOS
       * ============================================================
       *
       * Si existe:
       * - NO consumimos API externa.
       * - Cargamos el cliente.
       * - Entramos automáticamente en edición.
       */

      const existente = await buscarClientePorDocumento(
        pasoModal,
        limpio
      );

      if (existente) {
        cargarClienteEnFormulario(existente);

        setMensajeExito(
          "Este cliente ya está registrado. No se consultó la API externa. Hemos cargado los datos guardados para que puedas revisarlos o editarlos."
        );

        return;
      }

      /*
       * ============================================================
       * 2. SI NO EXISTE EN DB, CONSULTAMOS LA API
       * ============================================================
       *
       * IMPORTANTE (FIX):
       * consultarDni() / consultarRuc() en adminApi.ts YA lanzan
       * un throw si la API externa no encontró información, y si
       * tienen éxito devuelven el objeto de datos "pelado"
       * (DatosDNI / DatosRUC), NO un wrapper { encontrado, cliente }.
       *
       * Antes este código esperaba `respuesta.encontrado` y
       * `respuesta.cliente` / `respuesta.empresa`, propiedades que
       * nunca existen en el objeto retornado, por lo que SIEMPRE
       * se mostraba "No se encontró información..." incluso cuando
       * la API sí devolvía los datos correctamente.
       */

      setModoEdicion(null);

      if (pasoModal === "DNI") {
        const data = await consultarDni(limpio);

        setFormulario((actual) => ({
          ...actual,

          tipoDocumento: "DNI",
          numeroDoc:
            textoSeguro(data.dni) || limpio,

          nombre:
            textoSeguro(data.nombres) ||
            textoSeguro(data.nombre_completo),

          apellido:
            [
              textoSeguro(data.apellido_paterno),
              textoSeguro(data.apellido_materno),
            ]
              .filter(Boolean)
              .join(" "),

          apellidoPaterno:
            textoSeguro(data.apellido_paterno),

          apellidoMaterno:
            textoSeguro(data.apellido_materno),

          nombreCompleto:
            textoSeguro(data.nombre_completo),

          fechaNacimiento:
            convertirFechaDNI(
              textoSeguro(data.fecha_nacimiento)
            ),

          digRuc:
            textoSeguro((data as any).dig_ruc),

          ubigeoNacimiento:
            textoSeguro(
              (data as any).ubigeo_nacimiento
            ),

          ubigeoDireccion:
            textoSeguro(
              (data as any).ubigeo_direccion ??
                (data as any).ubigeo
            ),

          direccion:
            textoSeguro(data.direccion),

          sexo:
            textoSeguro((data as any).sexo),

          estadoCivil:
            textoSeguro((data as any).estado_civil),

          madre:
            textoSeguro((data as any).madre),

          padre:
            textoSeguro((data as any).padre),
        }));

        setMensajeExito(
          "Datos encontrados en la API. Revisa la información y guarda el cliente."
        );
      } else {
        const data = await consultarRuc(limpio);

        setFormulario((actual) => ({
          ...actual,

          tipoDocumento: "RUC",
          numeroDoc:
            textoSeguro(data.ruc) || limpio,

          razonSocial:
            textoSeguro(data.razon_social),

          nombreComercial:
            textoSeguro(data.nombre_comercial),

          tipoContribuyente:
            textoSeguro(data.tipo_contribuyente),

          estadoRuc:
            textoSeguro(data.estado),

          condicionRuc:
            textoSeguro(data.condicion),

          direccion:
            textoSeguro(
              (data as any).domicilio_fiscal ??
                (data as any).direccion
            ),

          fechaInscripcion:
            textoSeguro(
              (data as any).fecha_inscripcion
            ),

          actividadEconomica:
            textoSeguro(
              (data as any).actividad_economica
            ),

          sistemaContabilidad:
            textoSeguro(
              (data as any).sistema_contabilidad
            ),

          afiliadoPle:
            textoSeguro(
              (data as any).afiliado_ple
            ),

          emisorElectronico:
            textoSeguro(
              (data as any).emisor_electronico
            ),

          comprobantesElectronicos:
            textoSeguro(
              (data as any).comprobantes_electronicos
            ),

          padrones:
            textoSeguro(
              (data as any).padrones
            ),

          cantTrabajadores:
            normalizarTrabajadores(
              (data as any).cant_trabajadores
            ),

          representantes:
            normalizarRepresentantes(
              (data as any).representantes
            ),

          historico:
            normalizarHistorico(
              (data as any).historico
            ),
        }));

        setMensajeExito(
          "Datos encontrados en la API. Revisa la información y guarda el cliente."
        );
      }
    } catch (error: any) {
      console.error("Error buscando cliente:", error);

      const mensaje = textoSeguro(error?.message);

      setMensajeError(
        mensaje ||
          "Ocurrió un error durante la búsqueda. Intenta nuevamente."
      );
    } finally {
      setBuscando(false);
    }
  }

  async function guardar() {
    limpiarMensajes();

    const documento = formulario.numeroDoc
      .replace(/\D/g, "");

    if (!documento) {
      setMensajeError(
        "Ingresa un DNI o RUC."
      );

      return;
    }

    const longitudEsperada =
      formulario.tipoDocumento === "DNI" ? 8 : 11;

    if (documento.length !== longitudEsperada) {
      setMensajeError(
        formulario.tipoDocumento === "DNI"
          ? "El DNI debe tener 8 dígitos."
          : "El RUC debe tener 11 dígitos."
      );

      return;
    }

    if (formulario.tipoDocumento === "DNI") {
      if (
        !formulario.nombreCompleto &&
        !formulario.nombre &&
        !formulario.apellido
      ) {
        setMensajeError(
          "Completa los datos del cliente antes de guardar."
        );

        return;
      }
    }

    if (
      formulario.tipoDocumento === "RUC" &&
      !formulario.razonSocial
    ) {
      setMensajeError(
        "La razón social es obligatoria para un RUC."
      );

      return;
    }

    try {
      setGuardando(true);

      /*
       * Verificación adicional contra duplicados.
       *
       * Esto se hace incluso antes del RPC.
       */
      const existente =
        await buscarClientePorDocumento(
          formulario.tipoDocumento,
          documento
        );

      if (
        existente &&
        (!modoEdicion ||
          existente.id !== modoEdicion.id)
      ) {
        setMensajeError(
          "Este DNI/RUC ya está registrado. Se cargaron los datos existentes para que puedas editarlos."
        );

        cargarClienteEnFormulario(existente);

        return;
      }

      const datos = {
        tipo_documento: formulario.tipoDocumento,

        dni:
          formulario.tipoDocumento === "DNI"
            ? documento
            : null,

        ruc:
          formulario.tipoDocumento === "RUC"
            ? documento
            : null,

        nombre: formulario.nombre,
        apellido: formulario.apellido,
        celular: formulario.celular || null,
        fecha_nacimiento:
          formulario.fechaNacimiento || null,

        apellido_paterno:
          formulario.apellidoPaterno || null,

        apellido_materno:
          formulario.apellidoMaterno || null,

        nombre_completo:
          formulario.nombreCompleto || null,

        dig_ruc:
          formulario.digRuc || null,

        ubigeo_nacimiento:
          formulario.ubigeoNacimiento || null,

        ubigeo_direccion:
          formulario.ubigeoDireccion || null,

        direccion:
          formulario.direccion || null,

        sexo:
          formulario.sexo || null,

        estado_civil:
          formulario.estadoCivil || null,

        madre:
          formulario.madre || null,

        padre:
          formulario.padre || null,

        razon_social:
          formulario.razonSocial || null,

        nombre_comercial:
          formulario.nombreComercial || null,

        tipo_contribuyente:
          formulario.tipoContribuyente || null,

        estado_ruc:
          formulario.estadoRuc || null,

        condicion_ruc:
          formulario.condicionRuc || null,

        fecha_inscripcion:
          formulario.fechaInscripcion || null,

        actividad_economica:
          formulario.actividadEconomica || null,

        sistema_contabilidad:
          formulario.sistemaContabilidad || null,

        afiliado_ple:
          formulario.afiliadoPle || null,

        emisor_electronico:
          formulario.emisorElectronico || null,

        comprobantes_electronicos:
          formulario.comprobantesElectronicos || null,

        padrones:
          formulario.padrones || null,

        cant_trabajadores:
          formulario.cantTrabajadores,

        representantes:
          formulario.representantes,

        historico:
          formulario.historico,
      };

      if (modoEdicion) {
        await actualizarCliente(
          modoEdicion.id,
          datos as any
        );

        setMensajeExito(
          "Cliente actualizado correctamente."
        );
      } else {
        await crearCliente(datos as any);

        setMensajeExito(
          "Cliente registrado correctamente."
        );
      }

      await cargarClientes();

      setTimeout(() => {
        setModalAbierto(false);
        limpiarFormulario();
      }, 700);
    } catch (error: any) {
      console.error(
        "Error guardando cliente:",
        error
      );

      const mensaje =
        textoSeguro(error?.message) ||
        textoSeguro(error);

      if (
        mensaje.toLowerCase().includes("duplicate") ||
        mensaje.toLowerCase().includes("unique") ||
        mensaje.includes("23505")
      ) {
        setMensajeError(
          "No se pudo guardar porque ya existe un cliente con ese DNI/RUC."
        );
      } else {
        setMensajeError(
          mensaje ||
            "No se pudo guardar el cliente."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!modoEdicion) {
      return;
    }

    try {
      setEliminando(true);
      limpiarMensajes();

      await eliminarCliente(modoEdicion.id);

      setMensajeExito(
        "Cliente eliminado correctamente."
      );

      await cargarClientes();

      setTimeout(() => {
        setModalAbierto(false);
        limpiarFormulario();
      }, 700);
    } catch (error: any) {
      console.error(
        "Error eliminando cliente:",
        error
      );

      setMensajeError(
        textoSeguro(error?.message) ||
          "No se pudo eliminar el cliente."
      );
    } finally {
      setEliminando(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLowerCase();

    if (!termino) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const texto = [
        cliente.nombre,
        cliente.apellido,
        cliente.celular,
        cliente.dni,
        cliente.ruc,
        cliente.razon_social,
        cliente.nombre_comercial,
        cliente.nombre_completo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termino);
    });
  }, [clientes, busqueda]);

  return (
    <div className="w-full space-y-6">
      {/* ========================================================= */}
      {/* ENCABEZADO */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
            Clientes
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gestiona clientes, DNI, RUC y sus datos registrados.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={17} />
          Nuevo cliente
        </button>
      </div>

      {/* ========================================================= */}
      {/* BUSCADOR */}
      {/* ========================================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              placeholder="Buscar por nombre, DNI, RUC, teléfono o razón social..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5"
            />
          </div>

          <button
            type="button"
            onClick={cargarClientes}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                cargando
                  ? "animate-spin"
                  : ""
              }
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LISTADO */}
      {/* ========================================================= */}

      {cargando ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2
              size={28}
              className="animate-spin"
            />

            <span className="text-sm">
              Cargando clientes...
            </span>
          </div>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Users
              size={22}
              className="text-gray-500"
            />
          </div>

          <h3 className="font-semibold text-gray-900">
            No hay clientes
          </h3>

          <p className="mt-1 max-w-md text-sm text-gray-500">
            {busqueda
              ? "No encontramos clientes que coincidan con tu búsqueda."
              : "Todavía no tienes clientes registrados."}
          </p>

          {!busqueda && (
            <button
              type="button"
              onClick={abrirCrear}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={17} />
              Registrar cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ===================================================== */}
          {/* MOBILE */}
          {/* ===================================================== */}

          <div className="grid gap-3 md:hidden">
            {clientesFiltrados.map((cliente) => {
              const esRuc =
                cliente.tipo_documento === "RUC";

              const titulo = esRuc
                ? cliente.razon_social ||
                  cliente.nombre_comercial ||
                  "Empresa"
                : cliente.nombre_completo ||
                  [
                    cliente.nombre,
                    cliente.apellido,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  "Cliente";

              const documento = esRuc
                ? cliente.ruc
                : cliente.dni;

              return (
                <div
                  key={cliente.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        {esRuc ? (
                          <Building2
                            size={18}
                            className="text-gray-600"
                          />
                        ) : (
                          <User
                            size={18}
                            className="text-gray-600"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {titulo}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {esRuc
                            ? "RUC"
                            : "DNI"}{" "}
                          · {documento || "-"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        abrirEditar(cliente)
                      }
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black"
                    >
                      <Pencil size={17} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    {cliente.celular && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={15} />
                        <span>
                          {cliente.celular}
                        </span>
                      </div>
                    )}

                    {cliente.direccion && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin
                          size={15}
                          className="mt-0.5 shrink-0"
                        />
                        <span>
                          {cliente.direccion}
                        </span>
                      </div>
                    )}

                    {esRuc &&
                      cliente.estado_ruc && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Estado:
                          </span>

                          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                            {cliente.estado_ruc}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===================================================== */}
          {/* DESKTOP */}
          {/* ===================================================== */}

          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Cliente
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Documento
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Teléfono
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dirección
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {clientesFiltrados.map(
                    (cliente) => {
                      const esRuc =
                        cliente.tipo_documento ===
                        "RUC";

                      const titulo = esRuc
                        ? cliente.razon_social ||
                          cliente.nombre_comercial ||
                          "Empresa"
                        : cliente.nombre_completo ||
                          [
                            cliente.nombre,
                            cliente.apellido,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Cliente";

                      return (
                        <tr
                          key={cliente.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                                {esRuc ? (
                                  <Building2
                                    size={17}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <User
                                    size={17}
                                    className="text-gray-600"
                                  />
                                )}
                              </div>

                              <div>
                                <p className="font-medium text-gray-900">
                                  {titulo}
                                </p>

                                {esRuc &&
                                  cliente.nombre_comercial && (
                                    <p className="text-xs text-gray-500">
                                      {
                                        cliente.nombre_comercial
                                      }
                                    </p>
                                  )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <FileText
                                size={15}
                                className="text-gray-400"
                              />

                              <span className="text-sm text-gray-700">
                                {esRuc
                                  ? cliente.ruc ||
                                    "-"
                                  : cliente.dni ||
                                    "-"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm text-gray-600">
                              {cliente.celular ||
                                "-"}
                            </span>
                          </td>

                          <td className="max-w-[300px] px-5 py-4">
                            <span className="line-clamp-2 text-sm text-gray-600">
                              {cliente.direccion ||
                                "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                abrirEditar(
                                  cliente
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
                            >
                              <Pencil size={15} />
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL */}
      {/* ========================================================= */}

      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  {formulario.tipoDocumento ===
                  "RUC" ? (
                    <Building2
                      size={20}
                      className="text-gray-700"
                    />
                  ) : (
                    <User
                      size={20}
                      className="text-gray-700"
                    />
                  )}

                  <h2 className="text-lg font-semibold text-gray-950">
                    {modoEdicion
                      ? "Editar cliente"
                      : "Nuevo cliente"}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Busca primero en tu base de datos.
                  La API externa solo se consulta si
                  el cliente no existe.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={
                  guardando ||
                  buscando ||
                  eliminando
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENIDO */}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 p-5 sm:p-6">
                {/* MENSAJES */}

                {mensajeExito && (
                  <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-800">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {mensajeExito}
                    </span>
                  </div>
                )}

                {mensajeError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {mensajeError}
                    </span>
                  </div>
                )}

                {/* ================================================= */}
                {/* IDENTIFICACIÓN */}
                {/* ================================================= */}

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-gray-700"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Identificación
                    </h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[180px_1fr_auto]">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        Documento
                      </label>

                      <select
                        value={
                          formulario.tipoDocumento
                        }
                        onChange={(e) =>
                          cambiarTipoDocumento(
                            e.target
                              .value as TipoDocumento
                          )
                        }
                        disabled={!!modoEdicion}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-black focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        <option value="DNI">
                          DNI
                        </option>

                        <option value="RUC">
                          RUC
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        Número de{" "}
                        {formulario.tipoDocumento}
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={
                          formulario.tipoDocumento ===
                          "DNI"
                            ? 8
                            : 11
                        }
                        value={
                          formulario.numeroDoc
                        }
                        onChange={(e) =>
                          actualizarCampo(
                            "numeroDoc",
                            e.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        disabled={!!modoEdicion}
                        placeholder={
                          formulario.tipoDocumento ===
                          "DNI"
                            ? "Ej. 72465854"
                            : "Ej. 20538763072"
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-black focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />

                      {modoEdicion && (
                        <p className="text-[11px] text-gray-500">
                          El documento no se puede
                          cambiar durante la edición.
                        </p>
                      )}
                    </div>

                    <div className="flex items-end">
                      {!modoEdicion && (
                        <button
                          type="button"
                          onClick={buscar}
                          disabled={buscando}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                        >
                          {buscando ? (
                            <>
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <Search
                                size={16}
                              />
                              Buscar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* ================================================= */}
                {/* DATOS DNI */}
                {/* ================================================= */}

                {formulario.tipoDocumento ===
                  "DNI" && (
                  <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <User
                        size={18}
                        className="text-gray-700"
                      />

                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Datos personales
                        </h3>

                        <p className="text-xs text-gray-500">
                          Información obtenida del DNI.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Campo
                        label="Nombres"
                        value={
                          formulario.nombre
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "nombre",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Nombre completo"
                        value={
                          formulario.nombreCompleto
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "nombreCompleto",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Apellido paterno"
                        value={
                          formulario.apellidoPaterno
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "apellidoPaterno",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Apellido materno"
                        value={
                          formulario.apellidoMaterno
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "apellidoMaterno",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Apellido"
                        value={
                          formulario.apellido
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "apellido",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Fecha de nacimiento"
                        type="date"
                        value={
                          formulario.fechaNacimiento
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "fechaNacimiento",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Dígito RUC"
                        value={
                          formulario.digRuc
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "digRuc",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Sexo"
                        value={
                          formulario.sexo
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "sexo",
                            value
                          )
                        }
                        placeholder="Ej. 1 / 2"
                      />

                      <Campo
                        label="Estado civil"
                        value={
                          formulario.estadoCivil
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "estadoCivil",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Ubigeo de nacimiento"
                        value={
                          formulario.ubigeoNacimiento
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "ubigeoNacimiento",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Ubigeo de dirección"
                        value={
                          formulario.ubigeoDireccion
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "ubigeoDireccion",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Celular"
                        value={
                          formulario.celular
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "celular",
                            value
                          )
                        }
                        placeholder="Ej. 999999999"
                      />

                      <Campo
                        label="Madre"
                        value={
                          formulario.madre
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "madre",
                            value
                          )
                        }
                      />

                      <Campo
                        label="Padre"
                        value={
                          formulario.padre
                        }
                        onChange={(value) =>
                          actualizarCampo(
                            "padre",
                            value
                          )
                        }
                      />

                      <div className="md:col-span-2">
                        <CampoGrande
                          label="Dirección"
                          value={
                            formulario.direccion
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "direccion",
                              value
                            )
                          }
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* ================================================= */}
                {/* DATOS RUC */}
                {/* ================================================= */}

                {formulario.tipoDocumento ===
                  "RUC" && (
                  <>
                    <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Building2
                          size={18}
                          className="text-gray-700"
                        />

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Datos de la empresa
                          </h3>

                          <p className="text-xs text-gray-500">
                            Información obtenida del
                            RUC.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Campo
                          label="Razón social"
                          value={
                            formulario.razonSocial
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "razonSocial",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Nombre comercial"
                          value={
                            formulario.nombreComercial
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "nombreComercial",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Tipo de contribuyente"
                          value={
                            formulario.tipoContribuyente
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "tipoContribuyente",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Estado RUC"
                          value={
                            formulario.estadoRuc
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "estadoRuc",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Condición RUC"
                          value={
                            formulario.condicionRuc
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "condicionRuc",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Fecha de inscripción"
                          value={
                            formulario.fechaInscripcion
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "fechaInscripcion",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Sistema de contabilidad"
                          value={
                            formulario.sistemaContabilidad
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "sistemaContabilidad",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Afiliado PLE"
                          value={
                            formulario.afiliadoPle
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "afiliadoPle",
                              value
                            )
                          }
                        />

                        <Campo
                          label="Emisor electrónico"
                          value={
                            formulario.emisorElectronico
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "emisorElectronico",
                              value
                            )
                          }
                        />

                        <div className="md:col-span-2">
                          <CampoGrande
                            label="Actividad económica"
                            value={
                              formulario.actividadEconomica
                            }
                            onChange={(value) =>
                              actualizarCampo(
                                "actividadEconomica",
                                value
                              )
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <CampoGrande
                            label="Comprobantes electrónicos"
                            value={
                              formulario.comprobantesElectronicos
                            }
                            onChange={(value) =>
                              actualizarCampo(
                                "comprobantesElectronicos",
                                value
                              )
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <CampoGrande
                            label="Padrones"
                            value={
                              formulario.padrones
                            }
                            onChange={(value) =>
                              actualizarCampo(
                                "padrones",
                                value
                              )
                            }
                            rows={4}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <CampoGrande
                            label="Domicilio fiscal"
                            value={
                              formulario.direccion
                            }
                            onChange={(value) =>
                              actualizarCampo(
                                "direccion",
                                value
                              )
                            }
                            rows={3}
                          />
                        </div>

                        <Campo
                          label="Celular / contacto"
                          value={
                            formulario.celular
                          }
                          onChange={(value) =>
                            actualizarCampo(
                              "celular",
                              value
                            )
                          }
                          placeholder="Ej. 999999999"
                        />
                      </div>
                    </section>

                    {/* ============================================= */}
                    {/* TRABAJADORES */}
                    {/* ============================================= */}

                    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <BriefcaseBusiness
                          size={18}
                          className="text-gray-700"
                        />

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Trabajadores
                          </h3>

                          <p className="text-xs text-gray-500">
                            Información histórica reportada
                            para el RUC.
                          </p>
                        </div>
                      </div>

                      {formulario
                        .cantTrabajadores
                        .length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
                          No hay información de
                          trabajadores.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full min-w-[650px] text-left text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Periodo
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Pensionistas
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Prestadores
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Trabajadores
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {formulario.cantTrabajadores.map(
                                (
                                  trabajador,
                                  index
                                ) => (
                                  <tr
                                    key={`${trabajador.periodo}-${index}`}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {
                                        trabajador.periodo
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        trabajador.numPensionista
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        trabajador.numPrestadoresServicio
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        trabajador.numTrabajadores
                                      }
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* ============================================= */}
                    {/* REPRESENTANTES */}
                    {/* ============================================= */}

                    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Users
                          size={18}
                          className="text-gray-700"
                        />

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Representantes
                          </h3>

                          <p className="text-xs text-gray-500">
                            Representantes registrados
                            para la empresa.
                          </p>
                        </div>
                      </div>

                      {formulario
                        .representantes
                        .length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
                          No hay representantes
                          registrados.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full min-w-[850px] text-left text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Cargo
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Nombre
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Documento
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Tipo
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Desde
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {formulario.representantes.map(
                                (
                                  representante,
                                  index
                                ) => (
                                  <tr
                                    key={`${representante.numDocumento}-${index}`}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {
                                        representante.cargo
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        representante.nombre
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        representante.numDocumento
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        representante.tipDocumento
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {formatearFecha(
                                        representante.fechaDesde
                                      )}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* ============================================= */}
                    {/* HISTÓRICO */}
                    {/* ============================================= */}

                    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <History
                          size={18}
                          className="text-gray-700"
                        />

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Histórico
                          </h3>

                          <p className="text-xs text-gray-500">
                            Información histórica asociada
                            al RUC.
                          </p>
                        </div>
                      </div>

                      {!formulario.historico ||
                      formulario.historico.bajas
                        .length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
                          No hay bajas históricas
                          registradas.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full min-w-[700px] text-left text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Fecha de baja
                                </th>

                                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                                  Razón social histórica
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {formulario.historico.bajas.map(
                                (
                                  baja,
                                  index
                                ) => (
                                  <tr
                                    key={`${baja.fechaBaja}-${index}`}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {formatearFecha(
                                        baja.fechaBaja
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {
                                        baja.razonSocial
                                      }
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* ================================================= */}
                {/* ELIMINAR */}
                {/* ================================================= */}

                {modoEdicion && (
                  <section className="rounded-xl border border-red-200 bg-red-50 p-4">
                    {!confirmarEliminar ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-red-900">
                            Eliminar cliente
                          </p>

                          <p className="mt-1 text-xs text-red-700">
                            Esta acción eliminará el registro
                            del cliente.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setConfirmarEliminar(
                              true
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 size={15} />
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-red-900">
                            ¿Confirmar eliminación?
                          </p>

                          <p className="mt-1 text-xs text-red-700">
                            Esta acción no se puede
                            deshacer.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmarEliminar(
                                false
                              )
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={eliminar}
                            disabled={
                              eliminando
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {eliminando ? (
                              <>
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                                Eliminando...
                              </>
                            ) : (
                              <>
                                <Trash2
                                  size={15}
                                />
                                Sí, eliminar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={
                  guardando ||
                  buscando ||
                  eliminando
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardar}
                disabled={
                  guardando ||
                  buscando ||
                  eliminando
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {modoEdicion
                      ? "Guardar cambios"
                      : "Registrar cliente"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}