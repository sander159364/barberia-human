import { useState } from "react";

interface ImagenConCargaProps {
  url: string | null;
  alt: string;
  icono?: React.ReactNode;
  className?: string;
}

/**
 * Muestra una imagen con un estado de carga (bolita/gris con animación de pulso)
 * mientras el <img> termina de descargar. Si no hay `url`, muestra directamente
 * el fondo gris con el ícono de respaldo (`icono`), sin intentar cargar nada.
 *
 * El tamaño y la forma (círculo o cuadrado) se controlan 100% desde `className`
 * (ej. "h-10 w-10 rounded-full" para un avatar circular, o "h-36 w-full rounded-t-2xl"
 * para una miniatura rectangular).
 */
export function ImagenConCarga({ url, alt, icono, className = "" }: ImagenConCargaProps) {
  const [cargando, setCargando] = useState(true);

  if (!url) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-carbon-2 text-criss ${className}`}>
        {icono}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden bg-carbon-2 ${className}`}>
      {cargando && <div className="absolute inset-0 animate-pulse bg-carbon-2" />}
      <img
        src={url}
        alt={alt}
        onLoad={() => setCargando(false)}
        onError={() => setCargando(false)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          cargando ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}