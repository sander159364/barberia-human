import { useState } from "react";

interface ImagenConCargaProps {
  url: string | null;
  alt: string;
  icono?: React.ReactNode;
  className?: string;
  /** Clase de fondo para el estado "sin foto" / "cargando". Default: bg-carbon-2 (tema oscuro admin). */
  fondo?: string;
}

/**
 * Muestra una imagen con un estado de carga (bolita/gris con animación de pulso)
 * mientras el <img> termina de descargar. Si no hay `url`, muestra directamente
 * el fondo gris con el ícono de respaldo (`icono`), sin intentar cargar nada.
 *
 * El tamaño y la forma (círculo o cuadrado) se controlan 100% desde `className`
 * (ej. "h-10 w-10 rounded-full" para un avatar circular, o "h-36 w-full rounded-t-2xl"
 * para una miniatura rectangular). El color del fondo de carga/fallback se controla
 * con `fondo` (por defecto bg-carbon-2, pensado para el admin oscuro).
 */
export function ImagenConCarga({ url, alt, icono, className = "", fondo = "bg-carbon-2" }: ImagenConCargaProps) {
  const [cargando, setCargando] = useState(true);

  if (!url) {
    return (
      <div className={`flex shrink-0 items-center justify-center text-criss ${fondo} ${className}`}>
        {icono}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden ${fondo} ${className}`}>
      {cargando && <div className={`absolute inset-0 animate-pulse ${fondo}`} />}
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