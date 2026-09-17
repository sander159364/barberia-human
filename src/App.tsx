
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoadingScreen } from "./components/LoadingScreen";
import { ToastProvider } from "./components/ui/Toast";
import { HomePage } from "./pages/HomePage";
import { ReservarPage } from "./pages/ReservarPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";

const LOADING_KEY = "huaman_loading_visto";

function App() {
  const [cargando, setCargando] = useState(() => {
    try {
      return sessionStorage.getItem(LOADING_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const terminarLoading = () => {
    try {
      sessionStorage.setItem(LOADING_KEY, "true");
    } catch {
      // Si sessionStorage no está disponible, simplemente continuamos.
    }

    setCargando(false);
  };

  return (
    <ToastProvider>
      <AuthProvider>
        {cargando && (
          <LoadingScreen onFinish={terminarLoading} />
        )}

        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/reservar" element={<ReservarPage />} />

          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
