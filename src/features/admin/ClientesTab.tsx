import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  UserRound,
  Phone,
  CalendarDays,
  Cake,
  MapPin,
  IdCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  fetchClientes,
  buscarClientePorDni,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  consultarDni,
  convertirFechaDNI,
  type ClienteDB,
} from "../../lib/adminApi";

import { useAuth } from "../auth/AuthContext";

type ModoModal = "crear" | "editar";

export function ClientesTab() {
  /*
   * ============================================================
   * AUTENTICACIÓN
   * ============================================================
   *
   * No dependemos de ToastProvider.
   *
   * El AuthContext puede exponer el token directamente o dentro
   * del usuario. Manejamos ambas posibilidades para que el módulo
   * sea compatible con tu sistema actual.
   */
  const auth = useAuth() as unknown as {
    usuario?: {
      token?: string | null;
      session_id?: string | null;
      sessionId?: string | null;
    } | null;
    token?: string | null;
  };

  const usuario = auth.usuario;

  const token =
    auth.token ||
    usuario?.token ||
    usuario?.session_id ||
    usuario?.sessionId ||
    "";

  /*
   * ============================================================
   * ESTADOS
   * ============================================================
   */

  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>("crear");

  const [clienteEditando, setClienteEditando] =
    useState<ClienteDB | null>(null);

  /*
   * Datos del cliente
   */
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [celular, setCelular] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ubigeo, setUbigeo] = useState("");

  /*
   * Control de DNI existente
   */
  const [clienteYaRegistrado, setClienteYaRegistrado] =
    useState(false);

  /*
   * Mensajes internos.
   * Reemplazan ToastProvider para no depender de un archivo
   * que actualmente no existe en el proyecto.
   */
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  /*
   * ============================================================
   * CARGAR CLIENTES
   * ============================================================
   */

  async function cargarClientes() {
    try {
      setCargando(true);
      setMensajeError("");

      const data = await fetchClientes();

      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);

      setMensajeError(
        "No se pudieron cargar los clientes."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarClientes();
  }, []);

  /*
   * ============================================================
   * FILTRO
   * ============================================================
   */

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      return (
        cliente.nombre
          ?.toLowerCase()
          .includes(texto) ||
        cliente.apellido
          ?.toLowerCase()
          .includes(texto) ||
        cliente.nombre_completo
          ?.toLowerCase()
          .includes(texto) ||
        cliente.celular
          ?.toLowerCase()
          .includes(texto) ||
        cliente.dni
          ?.toLowerCase()
          .includes(texto)
      );
    });
  }, [clientes, busqueda]);

  /*
   * ============================================================
   * LIMPIAR MENSAJES
   * ============================================================
   */

  function limpiarMensajes() {
    setMensajeExito("");
    setMensajeError("");
  }

  /*
   * ============================================================
   * ABRIR MODAL CREAR
   * ============================================================
   */

  function abrirCrear() {
    limpiarMensajes();

    setModoModal("crear");
    setClienteEditando(null);

    setDni("");
    setNombre("");
    setApellido("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setNombreCompleto("");
    setCelular("");
    setFechaNacimiento("");
    setDireccion("");
    setUbigeo("");

    setClienteYaRegistrado(false);

    setModalAbierto(true);
  }

  /*
   * ============================================================
   * ABRIR MODAL EDITAR
   * ============================================================
   */

  function abrirEditar(cliente: ClienteDB) {
    limpiarMensajes();

    setModoModal("editar");
    setClienteEditando(cliente);

    setDni(cliente.dni ?? "");
    setNombre(cliente.nombre ?? "");
    setApellido(cliente.apellido ?? "");
    setApellidoPaterno(cliente.apellido_paterno ?? "");
    setApellidoMaterno(cliente.apellido_materno ?? "");
    setNombreCompleto(cliente.nombre_completo ?? "");
    setCelular(cliente.celular ?? "");
    setFechaNacimiento(cliente.fecha_nacimiento ?? "");
    setDireccion(cliente.direccion ?? "");
    setUbigeo(cliente.ubigeo ?? "");

    /*
     * En edición no debemos bloquear el botón guardar.
     */
    setClienteYaRegistrado(false);

    setModalAbierto(true);
  }

  /*
   * ============================================================
   * CERRAR MODAL
   * ============================================================
   */

  function cerrarModal() {
    if (guardando || buscandoDni || eliminando) {
      return;
    }

    setModalAbierto(false);
    setClienteEditando(null);
    limpiarMensajes();
  }

  /*
   * ============================================================
   * RELLENAR DESDE BASE DE DATOS
   * ============================================================
   */

  function rellenarDesdeBaseDatos(cliente: ClienteDB) {
    setDni(cliente.dni ?? "");
    setNombre(cliente.nombre ?? "");
    setApellido(cliente.apellido ?? "");
    setApellidoPaterno(cliente.apellido_paterno ?? "");
    setApellidoMaterno(cliente.apellido_materno ?? "");
    setNombreCompleto(cliente.nombre_completo ?? "");
    setCelular(cliente.celular ?? "");
    setFechaNacimiento(cliente.fecha_nacimiento ?? "");
    setDireccion(cliente.direccion ?? "");
    setUbigeo(cliente.ubigeo ?? "");
  }

  /*
   * ============================================================
   * BUSCAR DNI
   * ============================================================
   *
   * 1. Busca primero en Supabase.
   * 2. Si existe, NO llama a API Manager.
   * 3. Si no existe, llama a consultar-dni.
   */

  async function buscarPorDni() {
    limpiarMensajes();

    const dniLimpio = dni.replace(/\D/g, "");

    if (!/^\d{8}$/.test(dniLimpio)) {
      setMensajeError(
        "El DNI debe contener exactamente 8 dígitos."
      );
      return;
    }

    try {
      setBuscandoDni(true);

      /*
       * PRIMERO: buscar en nuestra propia base de datos.
       */
      const clienteExistente =
        await buscarClientePorDni(dniLimpio);

      if (clienteExistente) {
        rellenarDesdeBaseDatos(clienteExistente);

        setClienteYaRegistrado(true);

        setMensajeExito(
          "Este cliente ya está registrado. No se realizará una nueva consulta."
        );

        return;
      }

      /*
       * SEGUNDO: solamente si NO existe en nuestra DB,
       * consultamos API Manager mediante Edge Function.
       */
      const resultado = await consultarDni(dniLimpio);

      setDni(resultado.dni);

      setApellidoPaterno(
        resultado.apellido_paterno || ""
      );

      setApellidoMaterno(
        resultado.apellido_materno || ""
      );

      setNombre(resultado.nombres || "");

      setApellido(
        [
          resultado.apellido_paterno,
          resultado.apellido_materno,
        ]
          .filter(Boolean)
          .join(" ")
      );

      setNombreCompleto(
        resultado.nombre_completo || ""
      );

      setFechaNacimiento(
        convertirFechaDNI(
          resultado.fecha_nacimiento
        ) || ""
      );

      setDireccion(resultado.direccion || "");
      setUbigeo(resultado.ubigeo || "");

      setClienteYaRegistrado(false);

      setMensajeExito(
        "Datos encontrados correctamente. Revisa la información y guarda el cliente."
      );
    } catch (error) {
      console.error("Error buscando DNI:", error);

      const mensaje =
        error instanceof Error
          ? error.message
          : "No se pudo consultar el DNI.";

      setMensajeError(mensaje);
      setClienteYaRegistrado(false);
    } finally {
      setBuscandoDni(false);
    }
  }

  /*
   * ============================================================
   * GUARDAR CLIENTE
   * ============================================================
   */

  async function guardar() {
    limpiarMensajes();

    const dniLimpio = dni.replace(/\D/g, "");

    /*
     * Validaciones
     */
    if (!nombre.trim()) {
      setMensajeError(
        "El nombre del cliente es obligatorio."
      );
      return;
    }

    if (!apellido.trim()) {
      setMensajeError(
        "El apellido del cliente es obligatorio."
      );
      return;
    }

    if (dniLimpio && !/^\d{8}$/.test(dniLimpio)) {
      setMensajeError(
        "El DNI debe contener exactamente 8 dígitos."
      );
      return;
    }

    /*
     * Si estamos creando y ya sabemos que existe,
     * no permitimos duplicarlo.
     */
    if (
      modoModal === "crear" &&
      clienteYaRegistrado
    ) {
      setMensajeError(
        "Este cliente ya está registrado. No se puede crear nuevamente."
      );
      return;
    }

    /*
     * El token es necesario para los RPC de administración.
     */
    if (!token) {
      setMensajeError(
        "No se encontró una sesión válida. Vuelve a iniciar sesión."
      );
      return;
    }

    try {
      setGuardando(true);

      /*
       * ========================================================
       * EDITAR
       * ========================================================
       */

      if (
        modoModal === "editar" &&
        clienteEditando
      ) {
        /*
         * Si se cambió el DNI durante la edición,
         * comprobamos que no pertenezca a otro cliente.
         */
        if (
          dniLimpio &&
          dniLimpio !== clienteEditando.dni
        ) {
          const otroCliente =
            await buscarClientePorDni(dniLimpio);

          if (
            otroCliente &&
            otroCliente.id !== clienteEditando.id
          ) {
            setMensajeError(
              "Ese DNI ya pertenece a otro cliente."
            );
            return;
          }
        }

        const clienteActualizado: ClienteDB = {
          ...clienteEditando,

          nombre: nombre.trim(),
          apellido: apellido.trim(),
          celular:
            celular.trim() || null,
          fecha_nacimiento:
            fechaNacimiento || null,

          dni:
            dniLimpio || null,

          apellido_paterno:
            apellidoPaterno.trim() || null,

          apellido_materno:
            apellidoMaterno.trim() || null,

          nombre_completo:
            nombreCompleto.trim() || null,

          direccion:
            direccion.trim() || null,

          ubigeo:
            ubigeo.trim() || null,
        };

        await actualizarCliente(
          token,
          clienteActualizado
        );

        setMensajeExito(
          "Cliente actualizado correctamente."
        );

        await cargarClientes();

        setTimeout(() => {
          setModalAbierto(false);
          setClienteEditando(null);
          setMensajeExito("");
        }, 700);

        return;
      }

      /*
       * ========================================================
       * CREAR
       * ========================================================
       *
       * Segunda comprobación del DNI justo antes del INSERT.
       *
       * Esto evita duplicados aunque dos procesos intenten
       * guardar el mismo DNI al mismo tiempo.
       */

      if (dniLimpio) {
        const clienteExistente =
          await buscarClientePorDni(dniLimpio);

        if (clienteExistente) {
          rellenarDesdeBaseDatos(
            clienteExistente
          );

          setClienteYaRegistrado(true);

          setMensajeError(
            "Este cliente ya estaba registrado. No se creó un duplicado."
          );

          await cargarClientes();

          return;
        }
      }

      /*
       * Crear nuevo cliente.
       */
      await crearCliente(token, {
        nombre: nombre.trim(),

        apellido: apellido.trim(),

        celular: celular.trim(),

        fechaNacimiento:
          fechaNacimiento || null,

        dni:
          dniLimpio || null,

        apellidoPaterno:
          apellidoPaterno.trim() || null,

        apellidoMaterno:
          apellidoMaterno.trim() || null,

        nombreCompleto:
          nombreCompleto.trim() || null,

        direccion:
          direccion.trim() || null,

        ubigeo:
          ubigeo.trim() || null,
      });

      setMensajeExito(
        "Cliente registrado correctamente."
      );

      setClienteYaRegistrado(false);

      await cargarClientes();

      setTimeout(() => {
        setModalAbierto(false);
        setMensajeExito("");
      }, 700);
    } catch (error) {
      console.error(
        "Error guardando cliente:",
        error
      );

      /*
       * PostgreSQL puede devolver un error por índice UNIQUE
       * si el DNI ya existe.
       */
      const errorTexto =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        errorTexto
          .toLowerCase()
          .includes("clientes_dni_unique")
        ||
        errorTexto
          .toLowerCase()
          .includes("duplicate")
        ||
        errorTexto
          .toLowerCase()
          .includes("unique")
      ) {
        setMensajeError(
          "Ese DNI ya está registrado. No se puede crear un duplicado."
        );

        if (dniLimpio) {
          try {
            const existente =
              await buscarClientePorDni(
                dniLimpio
              );

            if (existente) {
              rellenarDesdeBaseDatos(
                existente
              );

              setClienteYaRegistrado(true);
            }
          } catch (buscarError) {
            console.error(
              "Error recuperando cliente duplicado:",
              buscarError
            );
          }
        }
      } else {
        setMensajeError(
          errorTexto ||
            "No se pudo guardar el cliente."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  /*
   * ============================================================
   * ELIMINAR CLIENTE
   * ============================================================
   */

  async function eliminar(cliente: ClienteDB) {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar a "${cliente.nombre_completo || `${cliente.nombre} ${cliente.apellido}`}"?`
    );

    if (!confirmar) {
      return;
    }

    if (!token) {
      setMensajeError(
        "No se encontró una sesión válida."
      );
      return;
    }

    try {
      setEliminando(true);
      limpiarMensajes();

      await eliminarCliente(
        token,
        cliente.id
      );

      setMensajeExito(
        "Cliente eliminado correctamente."
      );

      await cargarClientes();
    } catch (error) {
      console.error(
        "Error eliminando cliente:",
        error
      );

      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el cliente."
      );
    } finally {
      setEliminando(false);
    }
  }

  /*
   * ============================================================
   * FORMATEAR FECHA
   * ============================================================
   */

  function mostrarFecha(
    fecha: string | null
  ) {
    if (!fecha) {
      return "—";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <section className="space-y-6">
      {/* ======================================================
          ENCABEZADO
          ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-blanco">
            Clientes
          </h2>

          <p className="mt-1 font-body text-sm text-criss">
            Administra los clientes registrados en Huaman Barber Club.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blanco px-4 py-2.5 font-body text-sm font-semibold text-negro transition hover:bg-gray-200"
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      {/* ======================================================
          MENSAJE GLOBAL
          ====================================================== */}

      {mensajeExito && (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{mensajeError}</span>
        </div>
      )}

      {/* ======================================================
          BUSCADOR
          ====================================================== */}

      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-criss"
        />

        <input
          type="text"
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          placeholder="Buscar por nombre, apellido, DNI o celular..."
          className="w-full rounded-xl border border-carbon-2 bg-carbon-1 py-3 pl-11 pr-4 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
        />
      </div>

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-criss">
          {clientesFiltrados.length}{" "}
          {clientesFiltrados.length === 1
            ? "cliente"
            : "clientes"}
        </p>
      </div>

      {/* ======================================================
          LISTA
          ====================================================== */}

      {cargando ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-carbon-2 bg-carbon-1">
          <div className="flex flex-col items-center gap-3 text-criss">
            <Loader2
              size={28}
              className="animate-spin"
            />

            <span className="font-body text-sm">
              Cargando clientes...
            </span>
          </div>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-carbon-2 bg-carbon-1 px-6 text-center">
          <UserRound
            size={38}
            className="text-criss"
          />

          <h3 className="mt-4 font-display text-lg text-blanco">
            No hay clientes
          </h3>

          <p className="mt-1 max-w-md font-body text-sm text-criss">
            {busqueda
              ? "No encontramos clientes que coincidan con tu búsqueda."
              : "Todavía no hay clientes registrados."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-carbon-2 bg-carbon-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse">
              <thead>
                <tr className="border-b border-carbon-2 text-left">
                  <th className="px-5 py-4 font-body text-xs font-semibold uppercase tracking-wide text-criss">
                    Cliente
                  </th>

                  <th className="px-5 py-4 font-body text-xs font-semibold uppercase tracking-wide text-criss">
                    DNI
                  </th>

                  <th className="px-5 py-4 font-body text-xs font-semibold uppercase tracking-wide text-criss">
                    Celular
                  </th>

                  <th className="px-5 py-4 font-body text-xs font-semibold uppercase tracking-wide text-criss">
                    Fecha nacimiento
                  </th>

                  <th className="px-5 py-4 text-right font-body text-xs font-semibold uppercase tracking-wide text-criss">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map(
                  (cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b border-carbon-2 last:border-b-0"
                    >
                      {/* Cliente */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blanco text-negro">
                            <UserRound
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-body text-sm font-semibold text-blanco">
                              {cliente.nombre_completo ||
                                `${cliente.nombre} ${cliente.apellido}`}
                            </p>

                            {cliente.direccion && (
                              <p className="mt-0.5 max-w-xs truncate font-body text-xs text-criss">
                                {cliente.direccion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-body text-sm text-blanco">
                          <IdCard
                            size={16}
                            className="text-criss"
                          />

                          {cliente.dni || "—"}
                        </div>
                      </td>

                      {/* Celular */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-body text-sm text-blanco">
                          <Phone
                            size={16}
                            className="text-criss"
                          />

                          {cliente.celular || "—"}
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-body text-sm text-blanco">
                          <CalendarDays
                            size={16}
                            className="text-criss"
                          />

                          {mostrarFecha(
                            cliente.fecha_nacimiento
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                cliente
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-carbon-2 text-criss transition hover:border-blanco hover:text-blanco"
                            title="Editar cliente"
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void eliminar(
                                cliente
                              )
                            }
                            disabled={eliminando}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Eliminar cliente"
                          >
                            {eliminando ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL
          ====================================================== */}

      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-negro/80 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-carbon-2 bg-carbon-1 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-carbon-2 bg-carbon-1 px-5 py-4 sm:px-6">
              <div>
                <h3 className="font-display text-xl text-blanco">
                  {modoModal === "crear"
                    ? "Nuevo cliente"
                    : "Editar cliente"}
                </h3>

                <p className="mt-1 font-body text-xs text-criss">
                  {modoModal === "crear"
                    ? "Busca el DNI para completar automáticamente los datos."
                    : "Actualiza los datos del cliente."}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={
                  guardando ||
                  buscandoDni ||
                  eliminando
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-criss transition hover:bg-carbon-2 hover:text-blanco disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido */}
            <div className="space-y-6 px-5 py-6 sm:px-6">
              {/* ==================================================
                  DNI
                  ================================================== */}

              <div>
                <label className="mb-2 block font-body text-sm font-medium text-blanco">
                  DNI
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <IdCard
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-criss"
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={dni}
                      onChange={(e) => {
                        const valor =
                          e.target.value.replace(
                            /\D/g,
                            ""
                          );

                        setDni(valor);

                        /*
                         * Si el usuario modifica el DNI,
                         * ya no podemos asegurar que el cliente
                         * encontrado anteriormente corresponde
                         * al nuevo DNI.
                         */
                        setClienteYaRegistrado(
                          false
                        );

                        limpiarMensajes();
                      }}
                      placeholder="12345678"
                      className="w-full rounded-xl border border-carbon-2 bg-negro py-3 pl-10 pr-4 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void buscarPorDni()
                    }
                    disabled={
                      buscandoDni ||
                      dni.length !== 8
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blanco px-5 py-3 font-body text-sm font-semibold text-negro transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buscandoDni ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />

                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search size={17} />
                        Buscar DNI
                      </>
                    )}
                  </button>
                </div>

                {clienteYaRegistrado &&
                  modoModal === "crear" && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0"
                      />

                      <span>
                        Este DNI ya está registrado en
                        la base de datos. No se puede
                        crear nuevamente.
                      </span>
                    </div>
                  )}
              </div>

              {/* ==================================================
                  DATOS PERSONALES
                  ================================================== */}

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Nombre */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Nombres *
                  </label>

                  <div className="relative">
                    <UserRound
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-criss"
                    />

                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) =>
                        setNombre(
                          e.target.value
                        )
                      }
                      placeholder="Nombres"
                      className="w-full rounded-xl border border-carbon-2 bg-negro py-3 pl-10 pr-4 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                    />
                  </div>
                </div>

                {/* Apellido */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Apellidos *
                  </label>

                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) =>
                      setApellido(
                        e.target.value
                      )
                    }
                    placeholder="Apellidos"
                    className="w-full rounded-xl border border-carbon-2 bg-negro px-4 py-3 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                  />
                </div>

                {/* Apellido paterno */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Apellido paterno
                  </label>

                  <input
                    type="text"
                    value={apellidoPaterno}
                    onChange={(e) =>
                      setApellidoPaterno(
                        e.target.value
                      )
                    }
                    placeholder="Apellido paterno"
                    className="w-full rounded-xl border border-carbon-2 bg-negro px-4 py-3 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                  />
                </div>

                {/* Apellido materno */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Apellido materno
                  </label>

                  <input
                    type="text"
                    value={apellidoMaterno}
                    onChange={(e) =>
                      setApellidoMaterno(
                        e.target.value
                      )
                    }
                    placeholder="Apellido materno"
                    className="w-full rounded-xl border border-carbon-2 bg-negro px-4 py-3 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                  />
                </div>

                {/* Nombre completo */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Nombre completo
                  </label>

                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) =>
                      setNombreCompleto(
                        e.target.value
                      )
                    }
                    placeholder="Nombre completo"
                    className="w-full rounded-xl border border-carbon-2 bg-negro px-4 py-3 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                  />
                </div>

                {/* Celular */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Celular
                  </label>

                  <div className="relative">
                    <Phone
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-criss"
                    />

                    <input
                      type="text"
                      inputMode="tel"
                      value={celular}
                      onChange={(e) =>
                        setCelular(
                          e.target.value
                        )
                      }
                      placeholder="987654321"
                      className="w-full rounded-xl border border-carbon-2 bg-negro py-3 pl-10 pr-4 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                    />
                  </div>
                </div>

                {/* Fecha nacimiento */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Fecha de nacimiento
                  </label>

                  <div className="relative">
                    <Cake
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-criss"
                    />

                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(e) =>
                        setFechaNacimiento(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-carbon-2 bg-negro py-3 pl-10 pr-4 font-body text-sm text-blanco outline-none transition focus:border-blanco"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Dirección
                  </label>

                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-3 top-3 text-criss"
                    />

                    <textarea
                      value={direccion}
                      onChange={(e) =>
                        setDireccion(
                          e.target.value
                        )
                      }
                      placeholder="Dirección"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-carbon-2 bg-negro py-3 pl-10 pr-4 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                    />
                  </div>
                </div>

                {/* Ubigeo */}
                <div>
                  <label className="mb-2 block font-body text-sm font-medium text-blanco">
                    Ubigeo
                  </label>

                  <input
                    type="text"
                    value={ubigeo}
                    onChange={(e) =>
                      setUbigeo(
                        e.target.value
                      )
                    }
                    placeholder="Ubigeo"
                    className="w-full rounded-xl border border-carbon-2 bg-negro px-4 py-3 font-body text-sm text-blanco outline-none transition placeholder:text-criss focus:border-blanco"
                  />
                </div>
              </div>
            </div>

            {/* ==================================================
                FOOTER
                ================================================== */}

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-carbon-2 bg-carbon-1 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={
                  guardando ||
                  buscandoDni
                }
                className="rounded-xl border border-carbon-2 px-5 py-3 font-body text-sm font-medium text-criss transition hover:bg-carbon-2 hover:text-blanco disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void guardar()
                }
                disabled={
                  guardando ||
                  buscandoDni ||
                  (modoModal === "crear" &&
                    clienteYaRegistrado)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blanco px-5 py-3 font-body text-sm font-semibold text-negro transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Guardando...
                  </>
                ) : clienteYaRegistrado &&
                  modoModal === "crear" ? (
                  <>
                    <CheckCircle2
                      size={17}
                    />

                    Cliente ya registrado
                  </>
                ) : modoModal ===
                  "crear" ? (
                  <>
                    <Plus size={17} />

                    Guardar cliente
                  </>
                ) : (
                  <>
                    <Pencil size={17} />

                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}