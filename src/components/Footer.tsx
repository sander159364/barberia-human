import type { SVGProps } from "react";
import logo from "../imagen/logo.png";

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9c0-.67.33-1 1-1Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82c-.7-.77-1.09-1.77-1.09-2.82H12.9v13.6c0 1.36-1.1 2.46-2.46 2.46a2.46 2.46 0 0 1-2.46-2.46 2.46 2.46 0 0 1 2.46-2.46c.24 0 .48.03.7.1v-2.94a5.4 5.4 0 0 0-.7-.05A5.4 5.4 0 0 0 5.06 16.6a5.4 5.4 0 0 0 5.4 5.4 5.4 0 0 0 5.4-5.4V9.4a8.3 8.3 0 0 0 4.86 1.55V8.02a5.4 5.4 0 0 1-4.12-2.2Z" />
    </svg>
  );
}

const REDES = [
  {
    icon: FacebookIcon,
    href: "https://facebook.com/huamanbarberclub",
    label: "Facebook",
  },
  {
    icon: InstagramIcon,
    href: "https://instagram.com/huamanbarberclub",
    label: "Instagram",
  },
  {
    icon: TikTokIcon,
    href: "https://tiktok.com/@huamanbarberclub",
    label: "TikTok",
  },
];

export function Footer() {
  return (
    <footer className="bg-negro">

      {/* =========================================
          BANDA DE CIERRE
      ========================================= */}
      <div className="relative flex min-h-[210px] items-center overflow-hidden bg-carbon px-5 py-10 sm:min-h-[240px] sm:px-6 sm:py-12">
        <img
          src="/images/cta.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover contrast-110 saturate-125"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-negro via-negro/75 to-negro/35" />

        <div className="relative mx-auto w-full max-w-5xl">
          <p className="max-w-xl font-body text-base leading-relaxed text-blanco sm:text-lg md:text-xl">
            El arte del cuidado masculino elevado a su máxima expresión.
          </p>

          <p className="mt-2 max-w-xl font-body text-base leading-relaxed text-blanco sm:text-lg md:text-xl">
            Descubre la experiencia{" "}
            <span className="font-display text-lg uppercase text-amarillo sm:text-xl md:text-2xl">
              Huaman Barber Club
            </span>
            .
          </p>
        </div>
      </div>

      {/* =========================================
          LOGO + REDES
      ========================================= */}
      <div className="border-t border-carbon-2 bg-carbon px-4 py-10 text-center sm:px-6 sm:py-12 md:py-14">

        {/* LOGO */}
        <div className="flex w-full justify-center">
          <img
            src={logo}
            alt="Huaman Barber Club"
            className="
              h-auto
              w-[72%]
              max-w-[300px]
              object-contain
              sm:w-[55%]
              sm:max-w-[360px]
              md:w-[45%]
              md:max-w-[420px]
              lg:w-[420px]
            "
          />
        </div>

        {/* REDES SOCIALES */}
        <div className="mt-7 flex items-center justify-center gap-4 sm:mt-8 sm:gap-5 md:gap-6">
          {REDES.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="
                group
                flex
                h-12
                w-12
                items-center
                justify-center
                border
                border-carbon-2
                text-blanco
                transition-all
                duration-300
                hover:border-amarillo
                hover:bg-amarillo
                hover:text-negro
                sm:h-14
                sm:w-14
                md:h-16
                md:w-16
              "
            >
              <Icon
                className="
                  h-6
                  w-6
                  transition-transform
                  duration-300
                  group-hover:scale-110
                  sm:h-7
                  sm:w-7
                  md:h-8
                  md:w-8
                "
              />
            </a>
          ))}
        </div>
      </div>

      {/* =========================================
          COPYRIGHT
      ========================================= */}
      <div className="border-t border-carbon-2 px-5 py-5 sm:py-6">
        <p className="text-center font-body text-xs leading-relaxed text-criss sm:text-sm">
          © {new Date().getFullYear()} Huaman Barber Club. Todos los derechos
          reservados.
        </p>
      </div>

    </footer>
  );
}
