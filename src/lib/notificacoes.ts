/** Central de notificações do sistema. */

import { supabase } from "@/lib/supabase";

export type TipoNotificacao =
  | "info"
  | "sucesso"
  | "alteracao"
  | "exclusao"
  | "vencimento";

export interface Notificacao {
  id: string;
  usuario_id: string;
  titulo: string;
  mensagem: string | null;
  tipo: TipoNotificacao;
  link: string | null;
  lida: boolean;
  criado_em: string;
  /** Contrato relacionado ao aviso (ex.: vencimento). */
  contrato_id: string | null;
  /** Prazo em dias ao qual o aviso se refere (30, 60 ou 90). */
  prazo_dias: number | null;
}

const CAMPOS =
  "id, usuario_id, titulo, mensagem, tipo, link, lida, criado_em, contrato_id, prazo_dias";

/** Gera os avisos automáticos de vencimento de contratos (idempotente). */
export async function gerarAvisosVencimento(): Promise<void> {
  const { error } = await supabase.rpc("fn_gerar_notificacoes_vencimento");
  if (error) throw new Error(error.message);
}

/** Lista as notificações do usuário, mais recentes primeiro. */
export async function listarNotificacoes(usuarioId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select(CAMPOS)
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as Notificacao[];
}

/** Quantidade de notificações ainda não lidas. */
export async function contarNaoLidas(usuarioId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("lida", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Marca uma notificação como lida. */
export async function marcarComoLida(id: string): Promise<void> {
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Marca todas as notificações do usuário como lidas. */
export async function marcarTodasComoLidas(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("usuario_id", usuarioId)
    .eq("lida", false);
  if (error) throw new Error(error.message);
}

/** Exclui definitivamente uma notificação. */
export async function excluirNotificacao(id: string): Promise<void> {
  const { error } = await supabase.from("notificacoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Rótulo amigável do tipo de notificação. */
export function rotuloTipo(tipo: string): string {
  switch (tipo) {
    case "sucesso":
      return "Novo registro";
    case "alteracao":
      return "Alteração";
    case "exclusao":
      return "Exclusão";
    case "vencimento":
      return "Vencimento";
    default:
      return "Aviso";
  }
}
