import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Solo permitimos POST
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

    // Leer body
    const body = await req.json();

    const dni = String(body.dni ?? "").trim();

    // Validar DNI
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

    // Obtener token desde las variables de entorno
    const apiToken = Deno.env.get("API_MANAGER_TOKEN");

    if (!apiToken) {
      return new Response(
        JSON.stringify({
          error: "No está configurado API_MANAGER_TOKEN",
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

    // Consultar API Manager
    const response = await fetch(
      `https://apimanager.online/api/v1/dni?dni=${dni}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      }
    );

    const result = await response.json();

    // Error de API Manager
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error:
            result?.error ||
            result?.message ||
            "Error al consultar API Manager",
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

    // API Manager devuelve los resultados dentro de data
    const persona = result?.data?.[0];

    // DNI no encontrado
    if (!persona) {
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

    // Devolver solamente los datos que necesitamos
    const cliente = {
      dni,
      apellido_paterno: persona.ap_pat ?? "",
      apellido_materno: persona.ap_mat ?? "",
      nombres: persona.nombres ?? "",
      nombre_completo: persona.full_name ?? "",
      fecha_nacimiento: persona.fecha_nac ?? null,
      direccion: persona.direccion ?? "",
      ubigeo: persona.ubigeo_dir ?? "",
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
        error: "Error interno al consultar el DNI",
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