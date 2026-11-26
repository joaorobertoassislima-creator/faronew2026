import { supabase } from "@/lib/supabase";

export interface Requisicao {
  id: string;
  numero: string;
  solicitante: string | null;
  usuario_id: string | null;
  departamento_id: string | null;
  departamento_nome: string | null;
  data_solicitacao: string;
  status: string;
  observacoes: string | null;
  aprovado_por: string | null;
  data_aprovacao: string | null;
}

export interface ItemRequisicao {
  id: string;
  requisicao_id: string;
  produto_id: string | null;
  descricao: string | null;
  quantidade: number;
  unidade: string | null;
  quantidade_atendida: number | null;
  justificativa_corte: string | null;
}

export interface ProdutoPesquisavel {
  id: string;
  nome: string;
  unidade: string | null;
  estoque_atual: number;
}

export interface DepartamentoPesquisavel {
  id: string;
  nome: string;
  sigla: string | null;
}

export type Produto = ProdutoPesquisavel;
export type Departamento = DepartamentoPesquisavel;

export const STATUS_REQUISICAO = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "aprovada", rotulo: "Aprovada" },
  { valor: "atendida", rotulo: "Atendida" },
  { valor: "rejeitada", rotulo: "Rejeitada" },
  { valor: "cancelada", rotulo: "Cancelada" },
];

export function rotuloStatus(status: string): string {
  return STATUS_REQUISICAO.find((item) => item.valor === status)?.rotulo ?? status;
}

export interface PaginaResultado<T> {
  dados: T[];
  total: number;
  paginas: number;
}

interface ListarRequisicoesParams {
  usuarioId?: string | null;
  status?: string;
  numero?: string;
  solicitante?: string;
  pagina?: number;
  porPagina?: number;
}

export async function listarRequisicoes({
  usuarioId,
  status,
  numero,
  solicitante,
  pagina = 1,
  porPagina = 10,
}: ListarRequisicoesParams = {}): Promise<PaginaResultado<Requisicao>> {
  let consulta = supabase
    .from("requisicoes")
    .select(
      "id, numero, solicitante, usuario_id, departamento_id, data_solicitacao, status, observacoes, aprovado_por, data_aprovacao, departamentos(nome)",
      { count: "exact" },
    );

  if (usuarioId) consulta = consulta.eq("usuario_id", usuarioId);
  if (status) consulta = consulta.eq("status", status);
  if (numero) consulta = consulta.ilike("numero", `%${numero}%`);
  if (solicitante) consulta = consulta.ilike("solicitante", `%${solicitante}%`);

  const { data, error, count } = await consulta
    .order("data_solicitacao", { ascending: false })
    .order("numero", { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const brutas = (data ?? []) as Array<
    Requisicao & { departamentos?: { nome: string } | { nome: string }[] | null }
  >;

  const requisicoes: Requisicao[] = brutas.map((linha) => {
    const departamento = linha.departamentos;
    const nome = Array.isArray(departamento)
      ? departamento[0]?.nome
      : departamento?.nome ?? null;
    return {
      id: linha.id,
      numero: linha.numero,
      solicitante: linha.solicitante,
      usuario_id: linha.usuario_id,
      departamento_id: linha.departamento_id,
      departamento_nome: nome ?? null,
      data_solicitacao: linha.data_solicitacao,
      status: linha.status,
      observacoes: linha.observacoes,
      aprovado_por: linha.aprovado_por,
      data_aprovacao: linha.data_aprovacao,
    };
  });

  const total = count ?? 0;
  return {
    dados: requisicoes,
    total,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

export async function listarItensRequisicao(requisicaoId: string): Promise<ItemRequisicao[]> {
  const { data, error } = await supabase
    .from("requisicoes_itens")
    .select(
      "id, requisicao_id, produto_id, descricao, quantidade, unidade, quantidade_atendida, justificativa_corte",
    )
    .eq("requisicao_id", requisicaoId)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ItemRequisicao[];
}

export async function buscarProdutos({
  busca,
  pagina = 1,
  porPagina = 10,
}: {
  busca?: string;
  pagina?: number;
  porPagina?: number;
} = {}): Promise<PaginaResultado<ProdutoPesquisavel>> {
  let consulta = supabase
    .from("produtos")
    .select("id, nome, estoque_atual, unidades_medida(sigla)", { count: "exact" })
    .eq("ativo", true);

  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);

  const { data, error, count } = await consulta
    .order("nome", { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const brutos = (data ?? []) as Array<
    ProdutoPesquisavel & {
      unidades_medida?: { sigla: string } | { sigla: string }[] | null;
    }
  >;

  const produtos: ProdutoPesquisavel[] = brutos.map((linha) => {
    const unidade = linha.unidades_medida;
    const sigla = Array.isArray(unidade) ? unidade[0]?.sigla : unidade?.sigla;
    return {
      id: linha.id,
      nome: linha.nome,
      unidade: sigla ?? null,
      estoque_atual: Number(linha.estoque_atual ?? 0),
    };
  });

  const total = count ?? 0;
  return { dados: produtos, total, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

export async function buscarDepartamentos({
  busca,
  pagina = 1,
  porPagina = 10,
}: {
  busca?: string;
  pagina?: number;
  porPagina?: number;
} = {}): Promise<PaginaResultado<DepartamentoPesquisavel>> {
  let consulta = supabase
    .from("departamentos")
    .select("id, nome, sigla", { count: "exact" })
    .eq("ativo", true);

  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);

  const { data, error, count } = await consulta
    .order("nome", { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    dados: (data ?? []) as DepartamentoPesquisavel[],
    total,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

/** Alias usados pelas modais de pesquisa de requisição. */
export const buscarProdutosRequisicao = buscarProdutos;
export const buscarDepartamentosRequisicao = buscarDepartamentos;

/** Gera o numero sequencial da requisicao (REQ-AAAA-NNNN) no banco. */
export async function gerarNumeroRequisicao(): Promise<string> {
  const { data, error } = await supabase.rpc("gerar_numero_requisicao");
  if (error) throw new Error(error.message);
  const numero = typeof data === "string" ? data : String(data ?? "");
  if (!numero) throw new Error("Não foi possível gerar o número da requisição.");
  return numero;
}

export async function criarRequisicao({
  usuarioId,
  numero,
  solicitante,
  departamentoId,
  observacoes,
}: {
  usuarioId: string;
  numero: string;
  solicitante: string;
  departamentoId: string;
  observacoes?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("requisicoes")
    .insert({
      usuario_id: usuarioId,
      numero,
      solicitante,
      departamento_id: departamentoId,
      observacoes: observacoes ?? null,
      status: "pendente",
      data_solicitacao: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function adicionarItemRequisicao({
  requisicaoId,
  produtoId,
  descricao,
  quantidade,
  unidade,
}: {
  requisicaoId: string;
  produtoId: string;
  descricao: string;
  quantidade: number;
  unidade?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("requisicoes_itens").insert({
    requisicao_id: requisicaoId,
    produto_id: produtoId,
    descricao,
    quantidade,
    unidade: unidade ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function atualizarItemRequisicao({
  itemId,
  quantidade,
  quantidadeAtendida,
  justificativaCorte,
}: {
  itemId: string;
  quantidade?: number;
  quantidadeAtendida?: number | null;
  justificativaCorte?: string | null;
}): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (quantidade !== undefined) payload.quantidade = quantidade;
  if (quantidadeAtendida !== undefined) payload.quantidade_atendida = quantidadeAtendida;
  if (justificativaCorte !== undefined) payload.justificativa_corte = justificativaCorte;

  const { error } = await supabase
    .from("requisicoes_itens")
    .update(payload)
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

export async function removerItemRequisicao(itemId: string): Promise<void> {
  const { error } = await supabase.from("requisicoes_itens").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function atualizarStatusRequisicao(
  requisicaoId: string,
  status: string,
  aprovadorId?: string | null,
): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (status === "aprovada") {
    payload.aprovado_por = aprovadorId ?? null;
    payload.data_aprovacao = new Date().toISOString();
  }

  const { error } = await supabase
    .from("requisicoes")
    .update(payload)
    .eq("id", requisicaoId);

  if (error) throw new Error(error.message);
}

export async function aprovarRequisicao(
  requisicaoId: string,
  aprovadorId: string,
): Promise<void> {
  await atualizarStatusRequisicao(requisicaoId, "aprovada", aprovadorId);
}

export async function rejeitarRequisicao(requisicaoId: string): Promise<void> {
  await atualizarStatusRequisicao(requisicaoId, "rejeitada");
}

export async function atenderRequisicao(requisicaoId: string): Promise<void> {
  await atualizarStatusRequisicao(requisicaoId, "atendida");
}

export async function cancelarRequisicao(requisicaoId: string): Promise<void> {
  await atualizarStatusRequisicao(requisicaoId, "cancelada");
}

export async function excluirRequisicao(requisicaoId: string): Promise<void> {
  const { error } = await supabase.from("requisicoes").delete().eq("id", requisicaoId);
  if (error) throw new Error(error.message);
}
