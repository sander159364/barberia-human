import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Clock,
  Coffee,
  Wallet,
  LogOut,
  PanelLeft,
  Home,
  X,
  Settings,
  Boxes,
  Users,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { DashboardTab } from "../features/admin/DashboardTab";
import { ReservasTab } from "../features/admin/ReservasTab";
import { ServiciosTab } from "../features/admin/ServiciosTab";
import { HorariosTab } from "../features/admin/HorariosTab";
import { CafeteriaTab } from "../features/admin/CafeteriaTab";
import { CajaTab } from "../features/admin/CajaTab";
import { ConfiguracionTab } from "../features/admin/ConfiguracionTab";
import { InventarioTab } from "../features/admin/InventarioTab";
import { ClientesTab } from "../features/admin/ClientesTab";
import { BotonNotificaciones } from "../components/ui/BotonNotificaciones";

type Tab =
  | "dashboard"
  | "reservas"
  | "servicios"
  | "horarios"
  | "cafeteria"
  | "inventario"
  | "clientes"
  | "caja"
  | "configuracion";

const TABS: { id: Tab; label: string; icono: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icono: <LayoutDashboard size={18} /> },
  { id: "reservas", label: "Reservas", icono: <Calendar size={18} /> },
  { id: "servicios", label: "Servicios", icono: <Scissors size={18} /> },
  { id: "horarios", label: "Horarios", icono: <Clock size={18} /> },
  { id: "cafeteria", label: "Cafetería", icono: <Coffee size={18} /> },
  { id: "inventario", label: "Inventario", icono: <Boxes size={18} /> },
  { id: "clientes", label: "Clientes", icono: <Users size={18} /> },
  { id: "caja", label: "Caja", icono: <Wallet size={18} /> },
  { id: "configuracion", label: "Config.", icono: <Settings size={18} /> },
];

function calcularAngulos(cantidad: number) {
  const inicio = -170;
  const fin = -10;
  if (cantidad === 1) return [-90];
  const paso = (fin - inicio) / (cantidad - 1);
  return Array.from({ length: cantidad }, (_, i) => inicio + paso * i);
}

const RADIO_RUEDA = 110;

export function AdminPage() {
  const { usuario, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const tabActivo = TABS.find((t) => t.id === tab);
  const angulos = calcularAngulos(TABS.length);

  function elegirTabMovil(id: Tab) {
    setTab(id);
    setMenuMovilAbierto(false);
  }

  return (
    <div className="admin-theme min-h-screen bg-negro">
      {/* ---------- Sidebar hover, SOLO DESKTOP ---------- */}
      <div className="group/sidebar fixed inset-y-0 left-0 z-40 hidden lg:flex">
        <div className="h-full w-3" />

        <div className="pointer-events-none absolute left-0 top-1/2 flex h-16 w-1.5 -translate-y-1/2 items-center rounded-r-full bg-carbon-2 opacity-70 transition-opacity group-hover/sidebar:opacity-0" />

        <nav className="flex h-full w-60 -translate-x-full flex-col border-r border-carbon-2 bg-[#ffffff] pt-6 shadow-2xl transition-transform duration-300 ease-out group-hover/sidebar:translate-x-0">
          <div className="mb-6 flex items-center gap-2 px-5 font-body text-xs text-criss">
            <PanelLeft size={14} />
            Panel administrador
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-body text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-blanco text-negro" : "text-criss hover:bg-carbon-2 hover:text-blanco"
                }`}
              >
                {t.icono}
                {t.label}
              </button>
            ))}
          </div>

          <div className="border-t border-carbon-2 p-3">
            <BotonNotificaciones />
            <div className="mb-2 mt-3 px-2 font-body text-xs text-criss">{usuario?.nombre}</div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-criss transition-colors hover:bg-carbon-2 hover:text-blanco"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </nav>
      </div>

      {/* ---------- Rueda de navegación, SOLO MÓVIL ---------- */}
      <div className="lg:hidden">
        {menuMovilAbierto && (
          <div
            className="fixed inset-0 z-40 bg-negro/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuMovilAbierto(false)}
          />
        )}

        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
          {TABS.map((t, i) => {
            const angulo = (angulos[i] * Math.PI) / 180;
            const x = Math.cos(angulo) * RADIO_RUEDA;
            const y = Math.sin(angulo) * RADIO_RUEDA;

            return (
              <button
                key={t.id}
                onClick={() => elegirTabMovil(t.id)}
                style={{
                  transform: menuMovilAbierto
                    ? `translate(${x}px, ${y}px) scale(1)`
                    : "translate(0, 0) scale(0)",
                  transitionDelay: menuMovilAbierto ? `${i * 30}ms` : "0ms",
                }}
                className={`absolute bottom-0 left-0 flex h-14 w-14 flex-col items-center justify-center rounded-full text-[10px] font-medium shadow-lg transition-all duration-300 ease-out ${
                  tab === t.id ? "bg-blanco text-negro" : "bg-negro text-blanco"
                } ${menuMovilAbierto ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {t.icono}
                <span className="mt-0.5">{t.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setMenuMovilAbierto(false);
              logout();
            }}
            style={{
              transform: menuMovilAbierto
                ? `translate(${Math.cos((angulos[angulos.length - 1] * Math.PI) / 180) * (RADIO_RUEDA + 70)}px, ${
                    Math.sin((angulos[angulos.length - 1] * Math.PI) / 180) * (RADIO_RUEDA + 70)
                  }px) scale(1)`
                : "translate(0, 0) scale(0)",
              transitionDelay: menuMovilAbierto ? `${TABS.length * 30}ms` : "0ms",
            }}
            className={`absolute bottom-0 left-0 flex h-12 w-12 items-center justify-center rounded-full bg-amarillo text-negro shadow-lg transition-all duration-300 ease-out ${
              menuMovilAbierto ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <LogOut size={16} />
          </button>

          <button
            onClick={() => setMenuMovilAbierto((v) => !v)}
            className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-negro text-blanco shadow-xl transition-transform active:scale-95"
          >
            {menuMovilAbierto ? <X size={24} /> : <Home size={24} />}
          </button>
        </div>
      </div>

      {/* ---------- Contenido principal ---------- */}
      <div className="border-b border-carbon-2 px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="font-body text-xs text-criss sm:text-sm">Panel administrador</p>
            <h1 className="font-display text-xl text-blanco sm:text-2xl">{tabActivo?.label}</h1>
          </div>
          <BotonNotificaciones compacto />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 pb-32 sm:px-8 sm:py-8 lg:pb-8">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "reservas" && <ReservasTab />}
        {tab === "servicios" && <ServiciosTab />}
        {tab === "horarios" && <HorariosTab />}
        {tab === "cafeteria" && <CafeteriaTab />}
        {tab === "inventario" && <InventarioTab />}
        {tab === "clientes" && <ClientesTab />}
        {tab === "caja" && <CajaTab />}
        {tab === "configuracion" && <ConfiguracionTab />}
      </div>
    </div>
  );
}