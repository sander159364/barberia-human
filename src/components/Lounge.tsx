import { useEffect, useRef, useState } from "react";
import { CupSoda, Coffee, Cookie, FileText, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/Button";
import loungePoster from "../imagen/lounge.png";
import loungeVideo from "../video/cafeteria-convertido.mp4";

const CATEGORIAS = [
  { icon: CupSoda, label: "Cafés fríos" },
  { icon: Coffee, label: "Cafés calientes" },
  { icon: Cookie, label: "Postres" },
];

export function Lounge() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [silenciado, setSilenciado] = useState(true);

  // Reproduce el video solo cuando está visible en pantalla; lo pausa si no.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          video.play().catch(() => {
            // Algunos navegadores bloquean el autoplay; no pasa nada,
            // el poster (imagen) se sigue viendo mientras tanto.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-negro">
      <div className="mx-auto grid max-w-5xl grid-cols-1 lg:grid-cols-2">
        {/* Video del espacio, en el mismo lugar donde iba la foto */}
        <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-auto">
          <video
            ref={videoRef}
            src={loungeVideo}
            poster={loungePoster}
            muted={silenciado}
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover contrast-110 saturate-125"
          />

          <span className="absolute left-0 top-0 h-1 w-14 bg-amarillo" />

          {/* Botón de sonido */}
          <button
            type="button"
            onClick={() => setSilenciado((v) => !v)}
            aria-label={silenciado ? "Activar sonido" : "Silenciar"}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-blanco/30 bg-negro/60 text-blanco backdrop-blur-sm transition-colors hover:border-amarillo hover:text-amarillo"
          >
            {silenciado ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Contenido */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-16">
          <p className="mb-2 font-body text-sm tracking-wide text-amarillo">
            Mientras esperas
          </p>
          <h2 className="mb-4 font-display text-3xl uppercase text-blanco sm:text-4xl">
            Lounge &amp; Coffee
          </h2>
          <p className="mb-6 font-body text-sm leading-relaxed text-criss sm:text-base">
            Disfruta de nuestra selección de cafés y repostería fina en un
            espacio diseñado para tu confort. Ya sea para una charla entre
            amigos, un momento de lectura o una reunión de negocios, nuestra
            terraza es el punto de encuentro perfecto.
          </p>

          <ul className="mb-8 flex flex-wrap gap-3">
            {CATEGORIAS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 border border-carbon-2 bg-carbon px-4 py-2 font-body text-sm text-blanco"
              >
                <Icon size={16} className="text-amarillo" strokeWidth={1.75} />
                {label}
              </li>
            ))}
          </ul>

          <a href="/carta.pdf" target="_blank" rel="noopener noreferrer" className="w-fit">
            <Button className="gap-2">
              <FileText size={18} />
              Ver la carta
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}