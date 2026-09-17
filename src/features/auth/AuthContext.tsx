import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Usuario {
  token: string;
  id: string;
  nombre: string;
  email: string;
  rol: string;
  es_admin: boolean;
  modulos: string[];
}

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "huaman_admin_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      try {
        setUsuario(JSON.parse(guardado));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCargando(false);
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.rpc("login_usuario", {
      p_email: email.trim().toLowerCase(),
      p_password: password,
    });

    if (error) return { ok: false, error: "Error de conexión. Intenta de nuevo." };
    if (!data || data.length === 0) return { ok: false, error: "Correo o contraseña incorrectos." };

    const encontrado = data[0] as Usuario;
    setUsuario(encontrado);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encontrado));
    return { ok: true };
  }

  function logout() {
    if (usuario) {
      supabase.rpc("cerrar_sesion", { p_token: usuario.token }).then(() => {});
    }
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}