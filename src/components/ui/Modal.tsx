import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  ancho?: "sm" | "md" | "lg";
}

export function Modal({ abierto, onCerrar, titulo, children, ancho = "md" }: ModalProps) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    if (abierto) {
      const t = setTimeout(() => setMontado(true), 10);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
      };
    } else {
      setMontado(false);
      document.body.style.overflow = "";
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const anchoClase = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" }[ancho];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-negro/70 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${
        montado ? "opacity-100" : "opacity-0"
      }`}
      onClick={onCerrar}
    >
      <div
        className={`flex w-full ${anchoClase} max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border border-carbon-2 bg-carbon-1 shadow-2xl transition-all duration-250 ease-out sm:rounded-2xl sm:max-h-[85vh] ${
          montado
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-2 sm:scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Manija visual, solo móvil, sugiere que se puede deslizar */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-carbon-2" />
        </div>

        {/* Header sticky */}
        <div className="flex shrink-0 items-center justify-between border-b border-carbon-2 px-5 py-4 sm:border-none sm:pb-0 sm:pt-6">
          <h2 className="font-display text-base text-blanco sm:text-lg">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-criss transition-colors hover:bg-carbon-2 hover:text-blanco"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}