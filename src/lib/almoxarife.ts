import { supabase } from "@/lib/supabase";

export interface RequisicaoAlmoxarife {
  id: string;
  numero: string;
  solicitante: string | null;
  departamento_nome: string | null;
  data_solicitacao: string;
  data_aprovacao: string | null;
  data_atendimento: string | null;
  status: string;
  observacoes: string | null;
  almoxarife_id: string | null;
}

export interface ItemAtendimento {
  id: string;
  requisicao_id: string;
  produto_id: string | null;
  descricao: string | null;
  quantidade: number;
  unidade: string | null;
  quantidade_atendida: number | null;
  justificativa_corte: string | null;
  estoque_atual: number;
}

export interface PaginaAlmoxarife<T> {
  dados: T[];
  total: number;
  paginas: number;
}

export interface ItemAtendimentoEnviado {
  id: string;
  quantidadeAtendida: number;
  justificativa: string;
}

const CAMPOS_REQUISICAO =
  "id, numero, solicitante, data_solicitacao, data_aprovacao, data_atendimento, status, observacoes, almoxarife_id";

function extrairNomeDepartamento(valor: unknown): string | null {
  if (Array.isArray(valor)) {
    const primeiro = valor[0] as { nome?: string } | undefined;
    return primeiro?.nome ?? null;
  }
  if (valor && typeof valor === "object") {
    return (valor as { nome?: string }).nome ?? null;
  }
  return null;
}

/** Fila de separação: requisições aprovadas aguardando entrega, da mais antiga para a mais recente. */
export async function listarFilaSeparacao({
  numero,
  solicitante,
  pagina = 1,
  porPagina = 8,
}: {
  numero?: string;
  solicitante?: string;
  pagina?: number;
  porPagina?: number;
} = {}): Promise<PaginaAlmoxarife<RequisicaoAlmoxarife>> {
  let consulta = supabase
    .from("requisicoes")
    .select(`${CAMPOS_REQUISICAO}, departamentos(nome)`, { count: "exact" })
    .eq("status", "aprovada");

  if (numero) consulta = consulta.ilike("numero", `%${numero}%`);
  if (solicitante) consulta = consulta.ilike("solicitante", `%${solicitante}%`);

  const { data, error, count } = await consulta
    .order("data_aprovacao", { ascending: true })
    .order("numero", { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const brutos = (data ?? []) as Array<RequisicaoAlmoxarife & { departamentos?: unknown }>;
  const dados: RequisicaoAlmoxarife[] = brutos.map((linha) => ({
    ...linha,
    departamento_nome: extrairNomeDepartamento(linha.departamentos),
  }));

  const total = count ?? 0;
  return { dados, total, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Histórico: atendimentos (e recusas) realizados por este almoxarife. */
export async function listarHistoricoAtendimentos({
  almoxarifeId,
  numero,
  setor,
  pagina = 1,
  porPagina = 8,
}: {
  almoxarifeId: string;
  numero?: string;
  setor?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<PaginaAlmoxarife<RequisicaoAlmoxarife>> {
  let consulta = supabase
    .from("requisicoes")
    .select(
      setor
        ? `${CAMPOS_REQUISICAO}, departamentos!inner(nome)`
        : `${CAMPOS_REQUISICAO}, departamentos(nome)`,
      { count: "exact" },
    )
    .in("status", ["atendida", "cancelada"])
    .eq("almoxarife_id", almoxarifeId);

  if (numero) consulta = consulta.ilike("numero", `%${numero}%`);
  if (setor) consulta = consulta.ilike("departamentos.nome", `%${setor}%`);

  const { data, error, count } = await consulta
    .order("data_atendimento", { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const brutos = (data ?? []) as Array<RequisicaoAlmoxarife & { departamentos?: unknown }>;
  const dados: RequisicaoAlmoxarife[] = brutos.map((linha) => ({
    ...linha,
    departamento_nome: extrairNomeDepartamento(linha.departamentos),
  }));

  const total = count ?? 0;
  return { dados, total, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Itens da requisição com o estoque atual do produto, usados no modal de separação. */
export async function listarItensAtendimento(
  requisicaoId: string,
): Promise<ItemAtendimento[]> {
  const { data, error } = await supabase
    .from("requisicoes_itens")
    .select(
      "id, requisicao_id, produto_id, descricao, quantidade, unidade, quantidade_atendida, justificativa_corte, produtos(estoque_atual)",
    )
    .eq("requisicao_id", requisicaoId)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);

  const brutos = (data ?? []) as Array<ItemAtendimento & { produtos?: unknown }>;

  return brutos.map((linha) => {
    const produto = linha.produtos;
    let estoque = 0;
    if (Array.isArray(produto)) {
      estoque = Number((produto[0] as { estoque_atual?: number } | undefined)?.estoque_atual ?? 0);
    } else if (produto && typeof produto === "object") {
      estoque = Number((produto as { estoque_atual?: number }).estoque_atual ?? 0);
    }
    return { ...linha, estoque_atual: estoque };
  });
}

/** Nega (cancela) a requisição que está na fila de separação. */
export async function rejeitarRequisicaoAlmoxarife(
  requisicaoId: string,
  almoxarifeId: string,
): Promise<void> {
  const { error } = await supabase.rpc("negar_requisicao_almoxarife", {
    p_requisicao_id: requisicaoId,
    p_almoxarife_id: almoxarifeId,
  });

  if (error) throw new Error(error.message);
}

/** Confirma a separação: baixa no estoque, marca itens como atendidos e encerra a requisição. */
export async function atenderRequisicaoAlmoxarife({
  requisicaoId,
  almoxarifeId,
  itens,
}: {
  requisicaoId: string;
  almoxarifeId: string;
  itens: ItemAtendimentoEnviado[];
}): Promise<void> {
  const { error } = await supabase.rpc("atender_requisicao_almoxarife", {
    p_requisicao_id: requisicaoId,
    p_almoxarife_id: almoxarifeId,
    p_itens: itens.map((item) => ({
      id: item.id,
      quantidadeAtendida: item.quantidadeAtendida,
      justificativa: item.justificativa ?? "",
    })),
  });

  if (error) throw new Error(error.message);
}
