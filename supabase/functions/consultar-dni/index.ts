import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Método no permitido",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();

    const dni = String(body.dni ?? "").replace(/\D/g, "");

    if (!/^\d{8}$/.test(dni)) {
      return new Response(
        JSON.stringify({
          error: "El DNI debe contener exactamente 8 dígitos",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiToken = Deno.env.get("CONSULTADATOS_TOKEN");

    if (!apiToken) {
      return new Response(
        JSON.stringify({
          error: "No está configurado CONSULTADATOS_TOKEN",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const response = await fetch(
      `https://api2.consultadatos.com/api/dni/${dni}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      }
    );

    let result: any = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    console.log("Respuesta Consultas Datos:", {
      status: response.status,
      result,
    });

    if (!response.ok) {
      console.error("Error Consultas Datos API:", {
        status: response.status,
        result,
      });

      return new Response(
        JSON.stringify({
          encontrado: false,
          error:
            result?.error ||
            result?.message ||
            `Error al consultar el DNI. Código: ${response.status}`,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Algunas APIs pueden devolver:
     *
     * {
     *   DNI: "...",
     *   NOMBRES: "...",
     *   ...
     * }
     *
     * o eventualmente envolver los datos dentro de:
     *
     * {
     *   data: {
     *     DNI: "...",
     *     ...
     *   }
     * }
     *
     * Por eso soportamos ambas estructuras.
     */

    const persona =
      result?.data ??
      result?.cliente ??
      result;

    if (
      !persona ||
      typeof persona !== "object" ||
      !persona.DNI
    ) {
      return new Response(
        JSON.stringify({
          encontrado: false,
          error: "No se encontró información para ese DNI",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const dniRespuesta = String(persona.DNI ?? dni).trim();

    const nombres = String(persona.NOMBRES ?? "").trim();
    const apellidoPaterno = String(persona.AP_PAT ?? "").trim();
    const apellidoMaterno = String(persona.AP_MAT ?? "").trim();

    const nombreCompleto =
      String(persona.NOMBRE_COMPLETO ?? "").trim() ||
      [nombres, apellidoPaterno, apellidoMaterno]
        .filter(Boolean)
        .join(" ");

    const cliente = {
      dni: dniRespuesta,

      dig_ruc:
        persona.DIG_RUC != null
          ? String(persona.DIG_RUC)
          : null,

      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,

      nombres,

      nombre_completo: nombreCompleto,

      fecha_nacimiento:
        persona.FECHA_NAC != null
          ? String(persona.FECHA_NAC)
          : null,

      ubigeo_nacimiento:
        persona.UBIGEO_NAC != null
          ? String(persona.UBIGEO_NAC)
          : null,

      ubigeo_direccion:
        persona.UBIGEO_DIR != null
          ? String(persona.UBIGEO_DIR)
          : null,

      direccion:
        persona.DIRECCION != null
          ? String(persona.DIRECCION)
          : "",

      sexo:
        persona.SEXO != null
          ? String(persona.SEXO)
          : null,

      estado_civil:
        persona.EST_CIVIL != null
          ? String(persona.EST_CIVIL)
          : null,

      madre:
        persona.MADRE != null
          ? String(persona.MADRE)
          : null,

      padre:
        persona.PADRE != null
          ? String(persona.PADRE)
          : null,
    };

    return new Response(
      JSON.stringify({
        encontrado: true,
        cliente,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error consultar-dni:", error);

    return new Response(
      JSON.stringify({
        encontrado: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al consultar el DNI",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});