import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { guardarPushSubscription, eliminarPushSubscription } from "../lib/adminApi";

// Pega aquí tu clave PÚBLICA generada en el Paso 1
const VAPID_PUBLIC_KEY = "PEGA_AQUI_TU_PUBLIC_KEY";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { usuario } = useAuth();
  const [soportado, setSoportado] = useState(false);
  const [activo, setActivo] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    setSoportado("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  useEffect(() => {
    if (!soportado) return;
    navigator.serviceWorker.ready.then(async (registro) => {
      const sub = await registro.pushManager.getSubscription();
      setActivo(!!sub);
    });
  }, [soportado]);

  const activar = useCallback(async () => {
    if (!usuario || !soportado) return;
    setProcesando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setProcesando(false);
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js");
      const sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await guardarPushSubscription(usuario.token, {
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });

      setActivo(true);
    } finally {
      setProcesando(false);
    }
  }, [usuario, soportado]);

  const desactivar = useCallback(async () => {
    if (!usuario) return;
    setProcesando(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.getSubscription();
      if (sub) {
        await eliminarPushSubscription(usuario.token, sub.endpoint);
        await sub.unsubscribe();
      }
      setActivo(false);
    } finally {
      setProcesando(false);
    }
  }, [usuario]);

  return { soportado, activo, procesando, activar, desactivar };
}