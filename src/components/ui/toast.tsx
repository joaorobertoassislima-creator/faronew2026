import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type TipoToast = "sucesso" | "erro" | "info";

export interface Toast {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

interface ContextoToast {
  toast: (mensagem: string, tipo?: TipoToast) => void;
}

const Contexto = createContext<ContextoToast | null>(null);

const estilos: Record<TipoToast, string> = {
  sucesso: "border-emerald-200 bg-emerald-50 text-emerald-900",
  erro: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-card text-foreground",
};

const icones: Record<TipoToast, ReactNode> = {
  sucesso: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
  erro: <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />,
  info: <Info className="h-4 w-4 shrink-0 text-primary" />,
};

/**
 * Provedor de notificacoes (toast). As mensagens de acao do sistema
 * aparecem no canto superior direito da tela e somem sozinhas.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remover = useCallback((id: number) => {
    setToasts((atual) => atual.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (mensagem: string, tipo: TipoToast = "sucesso") => {
      const id = Date.now() + Math.random();
      setToasts((atual) => [...atual, { id, mensagem, tipo }]);
      window.setTimeout(() => remover(id), 4500);
    },
    [remover],
  );

  const valor = useMemo(() => ({ toast }), [toast]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <Toaster toasts={toasts} aoRemover={remover} />
    </Contexto.Provider>
  );
}

function Toaster({
  toasts,
  aoRemover,
}: {
  toasts: Toast[];
  aoRemover: (id: number) => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${estilos[item.tipo]}`}
        >
          {icones[item.tipo]}
          <p className="flex-1 leading-snug">{item.mensagem}</p>
          <button
            type="button"
            onClick={() => aoRemover(item.id)}
            aria-label="Fechar notificação"
            className="shrink-0 opacity-60 transition hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

/** Hook para exibir notificacoes a partir de qualquer tela. */
export function useToast() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useToast precisa estar dentro de ToastProvider.");
  }
  return contexto;
}
