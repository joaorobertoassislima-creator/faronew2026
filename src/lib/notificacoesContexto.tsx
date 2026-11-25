import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { contarNaoLidas } from "@/lib/notificacoes";
import { useAuth } from "@/lib/auth";

interface ContextoNotificacoes {
  naoLidas: number;
  recarregar: () => void;
}

const Contexto = createContext<ContextoNotificacoes | null>(null);

/**
 * Mantém o controle de notificações não lidas do usuário, com atualização
 * periódica para que o sino do menu reflita novos eventos do sistema.
 */
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  const recarregar = useCallback(() => {
    if (!usuario?.id) {
      setNaoLidas(0);
      return;
    }
    void contarNaoLidas(usuario.id)
      .then(setNaoLidas)
      .catch(() => undefined);
  }, [usuario?.id]);

  useEffect(() => {
    recarregar();
    const intervalo = window.setInterval(recarregar, 30000);
    return () => window.clearInterval(intervalo);
  }, [recarregar]);

  const valor = useMemo(() => ({ naoLidas, recarregar }), [naoLidas, recarregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNotificacoes() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useNotificacoes precisa estar dentro de NotificacoesProvider.");
  }
  return contexto;
}
