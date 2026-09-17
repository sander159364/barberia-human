import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/Button";
import { useServicios } from "../hooks/useServicios";

const ACENTOS = ["bg-amarillo", "bg-blanco", "bg-criss"];
const CANTIDAD_INICIAL = 3;

export function Services() {
  const { servicios, cargando } = useServicios();
  const [verTodos, setVerTodos] = useState(false);

  const serviciosVisibles = verTodos ? servicios : servicios.slice(0, CANTIDAD_INICIAL);
  const hayMas = servicios.length > CANTIDAD_INICIAL;

  return (
    <section id="servicios" className="bg-blanco px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="mb-2 font-body text-sm tracking-wide text-criss">Nuestro menú</p>
          <h2 className="font-display text-3xl text-negro sm:text-4xl">Servicios</h2>
        </div>

        {cargando ? (
          <p className="font-body text-sm text-criss">Cargando servicios...</p>
        ) : servicios.length === 0 ? (
          <p className="font-body text-sm text-criss">Pronto publicaremos nuestros servicios.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviciosVisibles.map((servicio, idx) => (
                <div
                  key={servicio.id}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden border border-carbon-2"
                >
                  {servicio.imagen_url ? (
                    <img
                      src={servicio.imagen_url}
                      alt={servicio.nombre}
                      className="absolute inset-0 h-full w-full object-cover object-top contrast-110 saturate-125 transition-transform duration-500 ease-out group-hover:scale-95"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-300">
                      <span className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-400 border-t-neutral-600" />
                    </div>
                  )}

                  <span className={`absolute left-0 top-0 h-1 w-14 z-10 ${ACENTOS[idx % ACENTOS.length]}`} />

                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-negro to-transparent" />

                  <div className="relative z-10 p-5">
                    <h3 className="mb-1 font-display text-lg uppercase text-blanco [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                      {servicio.nombre}
                    </h3>
                    <p className="mb-4 font-body text-xs text-blanco/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
                      {servicio.descripcion}
                    </p>

                    <Link to="/reservar">
                      <Button className="w-full !py-2 text-xs">Reservar cita</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {hayMas && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVerTodos((v) => !v)}
                  className="flex items-center gap-2 border border-carbon-2 px-6 py-2.5 font-body text-sm font-medium text-negro transition-colors hover:bg-negro hover:text-blanco"
                >
                  {verTodos ? (
                    <>
                      Ver menos <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Ver más servicios <ChevronDown size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}