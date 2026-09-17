import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function BotonInstalarApp() {
  const [promptEvento, setPromptEvento] = useState<any>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    function alPoderInstalar(e: Event) {
      e.preventDefault();
      setPromptEvento(e);
    }
    function alInstalar() {
      setInstalado(true);
      setPromptEvento(null);
    }

    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    window.addEventListener("appinstalled", alInstalar);

    // Si ya está corriendo como app instalada, no mostrar el botón
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalado(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  async function instalar() {
    if (!promptEvento) return;
    promptEvento.prompt();
    await promptEvento.userChoice;
    setPromptEvento(null);
  }

  if (instalado || !promptEvento) return null;

  return (
    <button
      onClick={instalar}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-criss transition-colors hover:bg-carbon-2 hover:text-blanco"
    >
      <Download size={18} />
      Instalar app
    </button>
  );
}