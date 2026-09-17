import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { activarNotificaciones, desactivarNotificaciones, notificacionesActivas } from "../../lib/pushNotifications";
import { useToast } from "./Toast";

export function BotonNotificaciones({ compacto = false }: { compacto?: boolean }) {
  const { usuario } = useAuth();
  const { mostrarExito, mostrarError } = useToast();
  const [activas, setActivas] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    notificacionesActivas().then(setActivas);
  }, []);

  async function toggle() {
    if (!usuario) return;
    setProcesando(true);
    try {
      if (activas) {
        await desactivarNotificaciones(usuario.token);
        setActivas(false);
        mostrarExito("Notificaciones desactivadas.");
      } else {
        await activarNotificaciones(usuario.token, usuario.id);
        setActivas(true);
        mostrarExito("Notificaciones activadas. Te avisaremos de nuevas reservas.");
      }
    } catch (e: any) {
      mostrarError(e?.message ?? "No se pudo cambiar el estado de las notificaciones.");
    } finally {
      setProcesando(false);
    }
  }

  if (compacto) {
    return (
      <button
        onClick={toggle}
        disabled={procesando}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          activas ? "bg-amarillo text-negro" : "bg-carbon-2 text-criss"
        }`}
        aria-label={activas ? "Desactivar notificaciones" : "Activar notificaciones"}
      >
        {procesando ? <Loader2 size={16} className="animate-spin" /> : activas ? <Bell size={16} /> : <BellOff size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={procesando}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-criss transition-colors hover:bg-carbon-2 hover:text-blanco"
    >
      {procesando ? <Loader2 size={18} className="animate-spin" /> : activas ? <Bell size={18} /> : <BellOff size={18} />}
      {activas ? "Notificaciones activadas" : "Activar notificaciones"}
    </button>
  );
}