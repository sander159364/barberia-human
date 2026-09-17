import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/Button";
import logo from "../imagen/logo.png";

export function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-carbon-2 bg-negro">
      <div className="mx-auto flex h-20 max-w-11xl items-center justify-between px-4 sm:h-24 sm:px-10">
        {/* Logo */}
        <Link to="/" className="flex items-center -ml-2 sm:ml-0">
          <img
            src={logo}
            alt="Huaman Barber Club"
            className="h-40 w-auto object-contain sm:h-50"
          />
        </Link>

        {/* Navegación desktop */}
        <nav className="hidden items-center gap-8 font-body text-base font-bold text-criss sm:flex sm:text-lg">
          <a
            href="/#servicios"
            className="transition-colors hover:text-blanco"
          >
            Servicios
          </a>

          <Link
            to="/reservar"
            className="transition-colors hover:text-blanco"
          >
            Reservar
          </Link>
        </nav>

        {/* Botón reservar desktop */}
        <Link to="/reservar" className="hidden sm:block">
          <Button className="!rounded-full !px-6 !py-2.5 text-sm font-bold sm:text-base">
            Reservar cita
          </Button>
        </Link>

        {/* Botón hamburguesa móvil */}
        <button
          type="button"
          className="pr-2 text-blanco sm:hidden"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Menú móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-negro sm:hidden">
          {/* Cabecera del menú móvil */}
          <div className="flex h-16 items-center justify-between border-b border-carbon-2 px-6">
            <span className="font-display text-lg text-blanco">
              MENÚ
            </span>

            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="text-blanco"
              aria-label="Cerrar menú"
            >
              <X size={28} />
            </button>
          </div>

          {/* Navegación móvil */}
          <nav className="flex flex-col gap-4 p-6">
            <a
              href="/#servicios"
              onClick={() => setMenuAbierto(false)}
              className="border-b border-carbon-2 py-4 font-display text-3xl text-blanco transition-colors hover:text-amarillo"
            >
              Servicios
            </a>

            <Link
              to="/reservar"
              onClick={() => setMenuAbierto(false)}
              className="border-b border-carbon-2 py-4 font-display text-3xl text-blanco transition-colors hover:text-amarillo"
            >
              Reservar
            </Link>

            <Link
              to="/reservar"
              onClick={() => setMenuAbierto(false)}
              className="mt-6"
            >
              <Button className="w-full !rounded-full py-4 text-base font-bold">
                Reservar cita
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
