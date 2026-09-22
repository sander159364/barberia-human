import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Método no permitido",
      },
      405
    );
  }

  try {
    const body = await req.json();

    const ruc = String(body.ruc ?? "").trim();

    // ============================================================
    // VALIDAR RUC
    // ============================================================

    if (!/^\d{11}$/.test(ruc)) {
      return json(
        {
          error: "El RUC debe contener exactamente 11 dígitos",
        },
        400
      );
    }

    // ============================================================
    // TOKEN
    // ============================================================

    const apiToken = Deno.env.get("API_MANAGER_TOKEN");

    if (!apiToken) {
      return json(
        {
          error: "No está configurado API_MANAGER_TOKEN",
        },
        500
      );
    }

    // ============================================================
    // CONSULTAR API EXTERNA
    // ============================================================

    const upstream = await fetch(
      `https://api2.consultadatos.com/api/ruc/${ruc}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      }
    );

    const texto = await upstream.text();

    let resultado: any;

    try {
      resultado = JSON.parse(texto);
    } catch {
      return json(
        {
          error: "La API externa no devolvió JSON válido.",
          raw: texto.slice(0, 500),
        },
        502
      );
    }

    // ============================================================
    // VALIDAR RESPUESTA DE LA API
    // ============================================================

    if (!upstream.ok || resultado?.success === false) {
      return json(
        {
          error:
            resultado?.message ||
            resultado?.error ||
            "Error al consultar el RUC",
          raw: resultado,
        },
        upstream.status === 200 ? 404 : upstream.status
      );
    }

    // La API devuelve los datos dentro de "data"
    const d = resultado?.data ?? resultado;

    if (!d || !d.ruc) {
      return json(
        {
          encontrado: false,
          error: "No se encontró información para ese RUC",
        },
        404
      );
    }

    // ============================================================
    // NORMALIZAR TRABAJADORES
    // ============================================================

    const cantTrabajadores = Array.isArray(d.cant_trabajadores)
      ? d.cant_trabajadores.map((item: any) => ({
          numPensionista: String(item?.numPensionista ?? ""),
          numPrestadoresServicio: String(
            item?.numPrestadoresServicio ?? ""
          ),
          numTrabajadores: String(item?.numTrabajadores ?? ""),
          periodo: String(item?.periodo ?? ""),
        }))
      : [];

    // ============================================================
    // NORMALIZAR REPRESENTANTES
    // ============================================================

    const representantes = Array.isArray(d.representantes)
      ? d.representantes.map((item: any) => ({
          cargo: String(item?.cargo ?? ""),
          fechaDesde: String(item?.fechaDesde ?? ""),
          nombre: String(item?.nombre ?? ""),
          numDocumento: String(item?.numDocumento ?? ""),
          tipDocumento: String(item?.tipDocumento ?? ""),
        }))
      : [];

    // ============================================================
    // NORMALIZAR HISTÓRICO
    // ============================================================

    const historico = {
      condiciones: Array.isArray(d?.historico?.condiciones)
        ? d.historico.condiciones
        : [],

      bajas: Array.isArray(d?.historico?.bajas)
        ? d.historico.bajas.map((item: any) => ({
            fechaBaja: String(item?.fechaBaja ?? ""),
            razonSocial: String(item?.razonSocial ?? ""),
          }))
        : [],
    };

    // ============================================================
    // EMPRESA COMPLETA
    // ============================================================

    const empresa = {
      // ----------------------------------------------------------
      // IDENTIFICACIÓN
      // ----------------------------------------------------------

      ruc: String(d.ruc ?? ruc),

      razon_social: String(d.razon_social ?? ""),

      nombre_comercial: String(d.nombre_comercial ?? ""),

      tipo_contribuyente: String(d.tipo_contribuyente ?? ""),

      // ----------------------------------------------------------
      // ESTADO SUNAT
      // ----------------------------------------------------------

      estado: String(d.estado ?? ""),

      condicion: String(d.condicion ?? ""),

      // ----------------------------------------------------------
      // DOMICILIO
      // ----------------------------------------------------------

      direccion: String(d.domicilio_fiscal ?? ""),

      // ----------------------------------------------------------
      // INFORMACIÓN TRIBUTARIA
      // ----------------------------------------------------------

      fecha_inscripcion: String(d.fecha_inscripcion ?? ""),

      actividad_economica: String(d.actividad_economica ?? ""),

      sistema_contabilidad: String(d.sistema_contabilidad ?? ""),

      afiliado_ple: String(d.afiliado_ple ?? ""),

      emisor_electronico: String(d.emisor_electronico ?? ""),

      comprobantes_electronicos: String(
        d.comprobantes_electronicos ?? ""
      ),

      padrones: String(d.padrones ?? ""),

      // ----------------------------------------------------------
      // TRABAJADORES
      // ----------------------------------------------------------

      cant_trabajadores: cantTrabajadores,

      // ----------------------------------------------------------
      // REPRESENTANTES
      // ----------------------------------------------------------

      representantes,

      // ----------------------------------------------------------
      // HISTÓRICO
      // ----------------------------------------------------------

      historico,
    };

    // ============================================================
    // RESPUESTA
    // ============================================================

    return json({
      encontrado: true,
      empresa,
    });
  } catch (error) {
    console.error("Error consultar-ruc:", error);

    return json(
      {
        error: "Error interno al consultar el RUC",
      },
      500
    );
  }
});