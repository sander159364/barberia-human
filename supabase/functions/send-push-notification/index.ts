import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:admin@huamanbarber.com", vapidPublic, vapidPrivate);

Deno.serve(async (req) => {
  const payload = await req.json();
  const reserva = payload.record; // fila insertada en "reservas"

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: servicio } = await supabase
    .from("servicios")
    .select("nombre")
    .eq("id", reserva.servicio_id)
    .maybeSingle();

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id")
    .eq("activo", true)
    .or("es_admin.eq.true,modulos.cs.{reservas}");

  const ids = (usuarios ?? []).map((u) => u.id);
  if (ids.length === 0) return new Response("ok", { status: 200 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("usuario_id", ids);

  const mensaje = JSON.stringify({
    titulo: "Nueva reserva",
    cuerpo: `${reserva.cliente_nombre} · ${servicio?.nombre ?? "Servicio"} · ${reserva.fecha} ${reserva.hora.slice(0, 5)}`,
    url: "/admin",
  });

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        mensaje
      );
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return new Response("ok", { status: 200 });
});