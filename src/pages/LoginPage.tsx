import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "../components/ui/Button";
import logo from "../imagen/logo.png";

export function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Si ya está logueado, no tiene sentido ver el login de nuevo
  if (usuario) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const resultado = await login(email, password);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo iniciar sesión.");
      return;
    }

    navigate("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-negro px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Huaman Barber Club" className="h-16 w-auto object-contain" />
        </div>

        <h1 className="mb-6 text-center font-display text-2xl uppercase text-blanco">
          Acceso administrador
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-body text-sm text-criss">Correo</label>
            <div className="flex items-center gap-2 border border-carbon-2 bg-carbon px-4 py-3">
              <Mail size={16} className="text-criss" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-blanco outline-none"
                placeholder="admin@huamanbarber.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-body text-sm text-criss">Contraseña</label>
            <div className="flex items-center gap-2 border border-carbon-2 bg-carbon px-4 py-3">
              <Lock size={16} className="text-criss" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-blanco outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="font-body text-sm text-amarillo">{error}</p>
          )}

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}