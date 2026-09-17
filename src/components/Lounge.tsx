import { CupSoda, Coffee, Cookie, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/Button";

const CATEGORIAS = [
  {
    icon: CupSoda,
    label: "Cafés fríos",
  },
  {
    icon: Coffee,
    label: "Cafés calientes",
  },
  {
    icon: Cookie,
    label: "Postres",
  },
];

export function Lounge() {
  return (
    <section
      id="cafeteria"
      className="relative overflow-hidden bg-negro py-20 sm:py-24 lg:py-28"
    >
      {/* Detalle decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/2 -translate-y-1/2 rounded-full bg-amarillo/5 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid overflow-hidden border border-carbon-2 bg-carbon lg:grid-cols-[1.05fr_0.95fr]">
          {/* IMAGEN */}
          <div className="group relative min-h-[380px] overflow-hidden sm:min-h-[460px] lg:min-h-[620px]">
            <img
              src="/cafeteria.jpg"
              alt="Cafetería y lounge de Huaman Barber Club"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-negro/80 via-negro/10 to-negro/20" />

            {/* Línea superior */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-1 w-20 bg-amarillo"
            />

            {/* Información sobre imagen */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="mb-2 font-body text-[10px] font-medium uppercase tracking-[0.28em] text-amarillo">
                    Huaman Barber Club
                  </p>

                  <h3 className="font-display text-2xl uppercase tracking-wide text-blanco sm:text-3xl">
                    Lounge &amp; Coffee
                  </h3>
                </div>


              </div>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="relative flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            {/* Línea decorativa */}
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-8 bg-amarillo" />
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.3em] text-amarillo">
                Mientras esperas
              </span>
            </div>

            <h2 className="max-w-lg font-display text-4xl uppercase leading-[0.95] tracking-wide text-blanco sm:text-5xl lg:text-[3.5rem]">
              Un espacio para
              <span className="mt-1 block text-amarillo">disfrutar</span>
            </h2>

            <p className="mt-7 max-w-xl font-body text-sm leading-7 text-criss sm:text-base sm:leading-8">
              Disfruta de nuestra selección de cafés y repostería en un
              ambiente pensado para complementar tu experiencia en Huaman.
              Relájate, conversa o simplemente disfruta tu tiempo mientras
              preparamos tu próximo look.
            </p>

            {/* Categorías */}
            <div className="mt-9 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {CATEGORIAS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="group flex items-center gap-3 border border-carbon-2 bg-negro/40 px-4 py-3.5 transition-all duration-300 hover:border-amarillo/50 hover:bg-negro"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-carbon-2 transition-colors duration-300 group-hover:border-amarillo/40">
                    <Icon
                      size={17}
                      strokeWidth={1.5}
                      className="text-amarillo"
                    />
                  </span>

                  <span className="font-body text-sm text-blanco">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Botón */}
            <div className="mt-9">
              <a
                href="/carta.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button className="group gap-3 px-6">
                  <FileText
                    size={17}
                    strokeWidth={1.7}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5"
                  />
                  Ver la carta
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.7}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Button>
              </a>
            </div>

            {/* Detalle inferior */}
            <div className="mt-10 flex items-center gap-3 border-t border-carbon-2 pt-5">
              <span className="h-1.5 w-1.5 bg-amarillo" />
              <span className="font-body text-[10px] uppercase tracking-[0.2em] text-criss">
                Café · Repostería · Experiencia
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
