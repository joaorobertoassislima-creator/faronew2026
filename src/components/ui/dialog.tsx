import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DialogProps {
  aberto: boolean;
  titulo: ReactNode;
  descricao?: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}

/**
 * Modal simples, responsivo e sem dependencias extras.
 * No mobile ocupa a tela inteira; no desktop aparece centralizado.
 */
export default function Dialog({
  aberto,
  titulo,
  descricao,
  aoFechar,
  children,
  rodape,
  largura = "max-w-3xl",
}: DialogProps) {
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={aoFechar}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === "string" ? titulo : undefined}
        className={`relative z-10 flex max-h-[92vh] w-full ${largura} flex-col rounded-t-xl border border-border bg-card shadow-xl sm:rounded-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold">{titulo}</h2>
            {descricao && (
              <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {rodape && (
          <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
