import { Link } from "react-router-dom";
import { Wifi, Coffee, Cake, ImageOff } from "lucide-react";
import { Button } from "./ui/Button";

import imagen1 from "../imagen/imagen1.jpeg";
import imagen2 from "../imagen/imagen2.jpeg";
import imagen3 from "../imagen/imagen3.jpeg";

const AMENIDADES = [
  {
    icon: Wifi,
    titulo: "Wifi gratis",
    texto:
      "Disfruta de una conexión rápida y estable para tu trabajo o entretenimiento.",
  },
  {
    icon: Coffee,
    titulo: "Bebida de cortesía",
    texto:
      "Tu servicio incluye una bebida de cortesía para que disfrutes de una experiencia de confort completa.",
  },
  {
    icon: Cake,
    titulo: "Cumpleaños",
    texto:
      "Celebra tu cumpleaños con un facial gratuito. Beneficio exclusivo para miembros con un mínimo de 2 visitas previas.",
  },
];

const IMAGENES = [
  { src: imagen1, alt: "Interior de Huaman Barber Club", etiqueta: "En el sillón" },
  { src: imagen2, alt: "Corte de cabello en proceso", etiqueta: "Detalle" },
  { src: imagen3, alt: "Equipo de Huaman Barber Club", etiqueta: "El equipo" },
];

const TICKER_ITEMS = ["CORTE", "BARBA", "FADE", "DISEÑO", "HUAMAN BARBER CLUB"];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-negro [clip-path:polygon(0_0,100%_0,100%_97%,0_100%)]">
      {/* Cinta con texto en movimiento */}
      <div className="relative overflow-hidden border-b-2 border-negro bg-amarillo py-2 text-negro">
        <div className="flex w-max whitespace-nowrap animate-marquee">
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex shrink-0">
              {TICKER_ITEMS.map((item) => (
                <span
                  key={`${rep}-${item}`}
                  className="px-4 font-display text-sm tracking-wide sm:text-base"
                >
                  {item} <span aria-hidden="true">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Borde amarillo fino */}
      <div className="h-1 bg-amarillo" />

      {/* Banda de 3 fotos, a color */}
      <div className="relative">
        <div className="flex h-[42vh] snap-x snap-mandatory overflow-x-auto sm:grid sm:h-[58vh] sm:grid-cols-3 sm:overflow-visible">
          {IMAGENES.map((img) => (
            <div
              key={img.alt}
              className="relative w-[88vw] shrink-0 snap-center sm:w-auto sm:shrink"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="h-full w-full object-cover contrast-105 saturate-110"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />

              <div className="absolute inset-0 hidden flex-col items-center justify-center gap-2 border border-carbon-2 bg-carbon text-criss">
                <ImageOff size={28} />
                <span className="px-4 text-center font-body text-xs">
                  No se pudo cargar la imagen
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-negro/70 to-transparent pointer-events-none" />

              <span className="absolute bottom-3 left-3 font-display text-xs tracking-wide text-blanco/90 uppercase">
                {img.etiqueta}
              </span>

              <div className="absolute inset-y-0 right-0 hidden w-[3px] bg-negro sm:block" />
            </div>
          ))}
        </div>

        {/* Sello circular */}
        <div className="absolute -bottom-10 right-6 z-20 h-20 w-20 sm:right-10 sm:h-28 sm:w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full animate-spin-slow" aria-hidden="true">
            <defs>
              <path
                id="circlePath"
                d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
              />
            </defs>
            <circle cx="50" cy="50" r="49" fill="#FFD800" stroke="#000000" strokeWidth="2" />
            <text fontSize="8.5" fontFamily="Anton, sans-serif" letterSpacing="1" fill="#000000">
              <textPath href="#circlePath" startOffset="0%">
                HUAMAN BARBER CLUB • CORTE Y ESTILO •
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl text-negro sm:text-3xl">H</span>
          </div>
        </div>
      </div>

      {/* Titular */}
      <div className="relative bg-negro px-6 pb-10 pt-16 sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 font-body text-sm tracking-wide text-amarillo sm:text-base">
            Corte, barba y estilo
          </p>
          <h1 className="mb-6 max-w-3xl font-display leading-[0.9] text-[clamp(2.5rem,9vw,6rem)] text-blanco">
            Tu corte,
            <br />
            a tu hora
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/reservar">
              <Button className="w-full sm:w-auto">Reservar mi cita</Button>
            </Link>
            <a href="#servicios">
              <Button variant="secondary" className="w-full sm:w-auto">
                Ver servicios
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Amenidades */}
      <div className="relative border-t border-carbon-2 bg-negro">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {AMENIDADES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="flex gap-4">
                <Icon className="shrink-0 text-amarillo" size={28} strokeWidth={1.75} />
                <div>
                  <h3 className="mb-1 font-display text-base text-blanco">{titulo}</h3>
                  <p className="font-body text-sm leading-snug text-criss">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}