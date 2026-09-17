import { useEffect, useState } from "react";
import logoImg from "../imagen/logo.png";
import fondoImg from "../imagen/fondo.jpg";

interface LoadingScreenProps {
  onFinish: () => void;
  duration?: number; // en milisegundos
}

export function LoadingScreen({ onFinish, duration = 5000 }: LoadingScreenProps) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const salirTimer = setTimeout(() => setSaliendo(true), duration);
    const cerrarTimer = setTimeout(() => {
      document.body.style.overflow = "";
      onFinish();
    }, duration + 500);

    return () => {
      clearTimeout(salirTimer);
      clearTimeout(cerrarTimer);
      document.body.style.overflow = "";
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-negro transition-opacity duration-500 ${
        saliendo ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={saliendo}
    >
      {/* Fondo con patrón de herramientas de barbería, en mosaico */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${fondoImg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "260px",
        }}
      />

      {/* Capa oscura encima del patrón, para que el logo y el texto se lean bien */}
      <div className="absolute inset-0 bg-negro/80" />

      {/* "Bienvenidos a" (mismo formato tipográfico que el logo) + logo grande */}
      <div className="relative z-10 flex flex-col items-center px-6">
        <p className="mb-3 animate-logo-in font-display text-2xl uppercase tracking-wide text-blanco sm:mb-4 sm:text-4xl md:text-5xl">
          Bienvenidos a
        </p>

        <div
          className="relative flex w-full animate-logo-in items-center justify-center"
          style={{ animationDelay: "0.15s" }}
        >
          <img
            src={logoImg}
            alt="Huaman Barber Club"
            className="relative h-32 w-auto max-w-[85vw] sm:h-44 md:h-52"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="relative hidden flex-col items-center text-center">
            <h1 className="font-display text-6xl leading-none text-blanco sm:text-8xl md:text-9xl">
              HUAMAN
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-criss" />
              <span className="font-body text-xs tracking-[0.3em] text-criss sm:text-sm">
                BARBER CLUB
              </span>
              <span className="h-px w-8 bg-criss" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}