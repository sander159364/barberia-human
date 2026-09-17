import { useEffect, useState } from "react";
import { Download, Bell, BellOff, X } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

export function InstalarPWA() {
  const [promptInstalacion, setPromptInstalacion] = useState<any>(null);
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const { soportado, activo, procesando, activar, desactivar } = usePushNotifications();

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setPromptInstalacion(e);
      setMostrarBanner(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function instalar() {
    if (!promptInstalacion) return;
    promptInstalacion.prompt();
    await promptInstalacion.userChoice;
    setPromptInstalacion(null);
    setMostrarBanner(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-carbon-2 p-3">
      {mostrarBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-amarillo/30 bg-amarillo/10 p-3">
          <Download size={16} className="shrink-0 text-amarillo" />
          <span className="flex-1 font-body text-xs text-blanco">Instala la app en tu celular</span>
          <button onClick={instalar} className="rounded-full bg-amarillo px-3 py-1 font-body text-xs font-bold text-negro">
            Instalar
          </button>
          <button onClick={() => setMostrarBanner(false)} className="text-criss">
            <X size={14} />
          </button>
        </div>
      )}

      {soportado && (
        <button
          onClick={activo ? desactivar : activar}
          disabled={procesando}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-body text-sm text-criss transition-colors hover:bg-carbon-2 hover:text-blanco"
        >
          {activo ? <Bell size={16} className="text-emerald-400" /> : <BellOff size={16} />}
          {procesando ? "Procesando..." : activo ? "Notificaciones activas" : "Activar notificaciones"}
        </button>
      )}
    </div>
  );
}