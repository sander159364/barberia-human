import { AlertTriangle, HelpCircle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  variante?: "normal" | "peligro";
  procesando?: boolean;
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  variante = "normal",
  procesando = false,
  textoConfirmar = "Confirmar",
  onConfirmar,
  onCancelar,
}: Props) {
  const esPeligro = variante === "peligro";

  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="sm">
      <div className="mb-6 flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            esPeligro ? "bg-amarillo/15 text-amarillo" : "bg-sky-400/15 text-sky-400"
          }`}
        >
          {esPeligro ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
        </div>
        <p className="pt-1.5 font-body text-sm leading-relaxed text-criss">{mensaje}</p>
      </div>

      {/* En móvil, botones apilados (más fácil de tocar); en desktop, lado a lado */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCancelar}
          disabled={procesando}
          className="flex-1 rounded-full border border-carbon-2 py-3 font-body text-sm font-medium text-criss transition-colors hover:bg-carbon-2 hover:text-blanco disabled:opacity-50 sm:py-2.5"
        >
          Cancelar
        </button>
        <Button
          type="button"
          onClick={onConfirmar}
          disabled={procesando}
          className={`flex-1 !py-3 sm:!py-2.5 ${esPeligro ? "!bg-red-500 hover:!opacity-90" : ""}`}
        >
          {procesando ? "Procesando..." : textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}