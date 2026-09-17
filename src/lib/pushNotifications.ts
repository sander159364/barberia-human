import { supabase } from "./supabaseClient";

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function activarNotificaciones(token: string, usuarioId: string) {
  if (!("Notification" in window) || !("PushManager" in window)) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error("Permiso de notificaciones denegado.");
  }

  const registro = await navigator.serviceWorker.ready;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });
  }

  const json = suscripcion.toJSON();
  const { error } = await supabase.rpc("guardar_suscripcion_push", {
    p_token: token,
    p_usuario_id: usuarioId,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys!.p256dh,
    p_auth: json.keys!.auth,
  });
  if (error) throw error;

  return suscripcion;
}

export async function desactivarNotificaciones(token: string) {
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) return;

  const endpoint = suscripcion.endpoint;
  await suscripcion.unsubscribe();
  await supabase.rpc("eliminar_suscripcion_push", { p_token: token, p_endpoint: endpoint });
}

export async function notificacionesActivas() {
  if (!("serviceWorker" in navigator)) return false;
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  return !!suscripcion;
}