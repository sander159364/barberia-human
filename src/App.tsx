import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { ToastProvider } from "./components/ui/Toast";
import { HomePage } from "./pages/HomePage";
import { ReservarPage } from "./pages/ReservarPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
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