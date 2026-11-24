import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import CadastroAdministrador from "@/pages/CadastroAdministrador";
import RedefinirSenha from "@/pages/RedefinirSenha";
import Home from "@/pages/Home";
import AppLayout from "@/components/layout/AppLayout";

function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RotasPublicas({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (sessao) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RotasPublicas>
            <Login />
          </RotasPublicas>
        }
      />
      <Route
        path="/cadastro-administrador"
        element={
          <RotasPublicas>
            <CadastroAdministrador />
          </RotasPublicas>
        }
      />
      <Route
        path="/redefinir-senha"
        element={
          <RotasPublicas>
            <RedefinirSenha />
          </RotasPublicas>
        }
      />
      <Route
        path="/"
        element={
          <RotaProtegida>
            <Home />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
