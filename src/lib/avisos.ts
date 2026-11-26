import { useEffect, useRef } from "react";
import { useToast, type TipoToast } from "@/components/ui/toast";

/**
 * Converte uma mensagem mantida em estado (erro, aviso ou recado do sistema)
 * em notificação toast. A mensagem é disparada uma única vez por valor,
 * voltando a ser exibida se for limpa e preenchida novamente.
 */
export function useAvisoToast(
  mensagem: string | null | undefined,
  tipo: TipoToast = "erro",
) {
  const { toast } = useToast();
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    if (!mensagem) {
      ultima.current = null;
      return;
    }
    if (ultima.current === mensagem) return;
    ultima.current = mensagem;
    toast(mensagem, tipo);
  }, [mensagem, tipo, toast]);
}
