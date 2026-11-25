import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import CadastroAdministrador from "@/pages/CadastroAdministrador";
import RedefinirSenha from "@/pages/RedefinirSenha";
import Home from "@/pages/Home";
import Contratos from "@/pages/Contratos";
import ContratoDetalhe from "@/pages/ContratoDetalhe";
import Perfil from "@/pages/Perfil";
import Notificacoes from "@/pages/Notificacoes";
import { NotificacoesProvider } from "@/lib/notificacoesContexto";
import AppLayout from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/toast";

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
    <ToastProvider>
      <NotificacoesProvider>
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
      <Route
        path="/contratos"
        element={
          <RotaProtegida>
            <Contratos />
          </RotaProtegida>
        }
      />
      <Route
        path="/contratos/:id"
        element={
          <RotaProtegida>
            <ContratoDetalhe />
          </RotaProtegida>
        }
      />
      <Route
        path="/perfil"
        element={
          <RotaProtegida>
            <Perfil />
          </RotaProtegida>
        }
      />
      <Route
        path="/notificacoes"
        element={
          <RotaProtegida>
            <Notificacoes />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </NotificacoesProvider>
    </ToastProvider>
  );
}
