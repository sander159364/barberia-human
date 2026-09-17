import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type TipoToast = "exito" | "error";

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ToastContextValue {
  mostrarExito: (mensaje: string) => void;
  mostrarError: (mensaje: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let idContador = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const quitar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = ++idContador;
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => quitar(id), 3000);
    },
    [quitar]
  );

  const mostrarExito = useCallback((mensaje: string) => mostrar("exito", mensaje), [mostrar]);
  const mostrarError = useCallback((mensaje: string) => mostrar("error", mensaje), [mostrar]);

  return (
    <ToastContext.Provider value={{ mostrarExito, mostrarError }}>
      {children}

      {/* Móvil: arriba, ancho completo, para no chocar con el botón flotante de abajo.
          Desktop: abajo a la derecha, como notificación flotante clásica. */}
      <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-[slideIn_0.25s_ease-out] sm:max-w-sm ${
              t.tipo === "exito"
                ? "border-emerald-400/30 bg-emerald-950/95 text-emerald-300"
                : "border-red-400/30 bg-red-950/95 text-red-300"
            }`}
          >
            {t.tipo === "exito" ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : (
              <XCircle size={18} className="shrink-0" />
            )}
            <span className="font-body text-sm leading-snug">{t.mensaje}</span>
            <button
              onClick={() => quitar(t.id)}
              className="ml-auto shrink-0 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}   