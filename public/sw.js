self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const titulo = data.titulo || "Huaman Barber Club";
  const opciones = {
    body: data.cuerpo || "Tienes una notificación nueva.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200], // patrón de vibración en móvil
    silent: false, // asegura que suene el tono del sistema
    requireInteraction: false,
    data: { url: data.url || "/admin" },
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(url) && "focus" in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});