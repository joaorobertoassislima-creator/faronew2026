import { supabase } from "@/lib/supabase";

export type StatusRequisicao = "pendente" | "aprovada" | "atendida" | "cancelada";

export const STATUS_REQUISICAO: { valor: StatusRequisicao; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Pendente (Chefia)" },
  { valor: "aprovada", rotulo: "Aprovada (Almoxarifado)" },
  { valor: "atendida", rotulo: "Atendida" },
  { valor: "cancelada", rotulo: "Cancelada" },
];

export interface Requisicao {
  id: string;
  usuario_id: string | null;
  numero: string;
  solicitante: string | null;
  departamento_id: string | null;
  data_solicitacao: string;
  status: StatusRequisicao;
  observacoes: string | null;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  departamento_nome?: string | null;
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
  estoque_atual?: number | null;
}

export interface Pagina<T> {
  dados: T[];
  total: number;
  pagina: number;
  paginas: number;
}

export interface ProdutoPesquisavel {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
}

export interface DepartamentoPesquisavel {
  id: string;
  nome: string;
  sigla: string | null;
}

interface LinhaRequisicao {
  id: string;
  usuario_id: string | null;
  numero: string;
  solicitante: string | null;
  departamento_id: string | null;
  data_solicitacao: string;
  status: StatusRequisicao;
  observacoes: string | null;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  departamentos?: { nome: string }[] | null;
}

interface LinhaItem {
  id: string;
  requisicao_id: string;
  produto_id: string | null;
  descricao: string | null;
  quantidade: number | null;
  unidade: string | null;
  quantidade_atendida: number | null;
  justificativa_corte: string | null;
  produtos?: { estoque_atual: number | null }[] | null;
}

/** Converte a linha do banco em um objeto de tela. */
function mapearRequisicao(linha: LinhaRequisicao): Requisicao {
  return {
    id: linha.id,
    usuario_id: linha.usuario_id,
    numero: linha.numero,
    solicitante: linha.solicitante,
    departamento_id: linha.departamento_id,
    data_solicitacao: linha.data_solicitacao,
    status: linha.status,
    observacoes: linha.observacoes,
    aprovado_por: linha.aprovado_por,
    data_aprovacao: linha.data_aprovacao,
    departamento_nome: linha.departamentos?.[0]?.nome ?? null,
  };
}

function mapearItem(linha: LinhaItem): ItemRequisicao {
  return {
    id: linha.id,
    requisicao_id: linha.requisicao_id,
    produto_id: linha.produto_id,
    descricao: linha.descricao,
    quantidade: Number(linha.quantidade ?? 0),
    unidade: linha.unidade,
    quantidade_atendida: linha.quantidade_atendida,
    justificativa_corte: linha.justificativa_corte,
    estoque_atual: linha.produtos?.[0]?.estoque_atual ?? null,
  };
}

/**
 * Lista as requisicoes com paginacao e filtros.
 * `somenteMinhas` restringe ao usuario logado (aba "Minhas Requisicoes").
 */
export async function listarRequisicoes(params: {
  somenteMinhas?: boolean;
  usuarioId?: string | null;
  status?: string;
  numero?: string;
  solicitante?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<Pagina<Requisicao>> {
  const pagina = params.pagina ?? 1;
  const porPagina = params.porPagina ?? 8;

  let consulta = supabase
    .from("requisicoes")
    .select(
      "id, usuario_id, numero, solicitante, departamento_id, data_solicitacao, status, observacoes, aprovado_por, data_aprovacao, departamentos(nome)",
      { count: "exact" },
    );

  if (params.somenteMinhas) {
    consulta = consulta.eq("usuario_id", params.usuarioId ?? "");
  } else {
    consulta = consulta.eq("status", "pendente");
  }

  if (params.status) consulta = consulta.eq("status", params.status);
  if (params.numero) consulta = consulta.ilike("numero", `%${params.numero}%`);
  if (params.solicitante) consulta = consulta.ilike("solicitante", `%${params.solicitante}%`);

  const { data, error, count } = await consulta
    .order("id", { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const linhas = (data ?? []) as unknown as LinhaRequisicao[];
  const total = count ?? linhas.length;

  return {
    dados: linhas.map(mapearRequisicao),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

/** Lista os itens de uma requisicao (com o estoque atual do produto). */
export async function listarItensRequisicao(requisicaoId: string): Promise<ItemRequisicao[]> {
  const { data, error } = await supabase
    .from("requisicoes_itens")
    .select(
      "id, requisicao_id, produto_id, descricao, quantidade, unidade, quantidade_atendida, justificativa_corte, produtos(estoque_atual)",
    )
    .eq("requisicao_id", requisicaoId)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LinhaItem[]).map(mapearItem);
}

/** Cria uma nova requisicao (cabecalho) e devolve o id gerado. */
export async function criarRequisicao(params: {
  usuarioId: string;
  numero: string;
  solicitante: string;
  departamentoId: string | null;
  observacoes: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("requisicoes")
    .insert({
      usuario_id: params.usuarioId,
      numero: params.numero,
      solicitante: params.solicitante,
      departamento_id: params.departamentoId,
      observacoes: params.observacoes,
      status: "pendente",
      data_solicitacao: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Insere um item no "carrinho" da requisicao. */
export async function adicionarItemRequisicao(params: {
  requisicaoId: string;
  produtoId: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
}): Promise<void> {
  const { error } = await supabase.from("requisicoes_itens").insert({
    requisicao_id: params.requisicaoId,
    produto_id: params.produtoId,
    descricao: params.descricao,
    quantidade: params.quantidade,
    unidade: params.unidade,
  });

  if (error) throw new Error(error.message);
}

/** Remove um item do "carrinho". */
export async function removerItemRequisicao(itemId: string): Promise<void> {
  const { error } = await supabase.from("requisicoes_itens").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

/** Aprova a requisicao (chefia). */
export async function aprovarRequisicao(requisicaoId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("requisicoes")
    .update({
      status: "aprovada",
      aprovado_por: usuarioId,
      data_aprovacao: new Date().toISOString(),
    })
    .eq("id", requisicaoId);
  if (error) throw new Error(error.message);
}

/** Rejeita a requisicao (chefia) -> cancelada. */
export async function rejeitarRequisicao(requisicaoId: string): Promise<void> {
  const { error } = await supabase
    .from("requisicoes")
    .update({ status: "cancelada" })
    .eq("id", requisicaoId);
  if (error) throw new Error(error.message);
}

/** Exclui definitivamente a requisicao (apenas status pendente). */
export async function excluirRequisicao(requisicaoId: string): Promise<void> {
  const { error } = await supabase.from("requisicoes").delete().eq("id", requisicaoId);
  if (error) throw new Error(error.message);
}

/** Marca a requisicao como atendida pelo almoxarifado. */
export async function atenderRequisicao(requisicaoId: string): Promise<void> {
  const { error } = await supabase
    .from("requisicoes")
    .update({ status: "atendida" })
    .eq("id", requisicaoId);
  if (error) throw new Error(error.message);
}

/** Lupa de produtos ativos (para o carrinho de materiais). */
export async function buscarProdutos(params: {
  busca?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<Pagina<ProdutoPesquisavel>> {
  const pagina = params.pagina ?? 1;
  const porPagina = params.porPagina ?? 5;

  let consulta = supabase
    .from("produtos")
    .select("id, nome, estoque_atual, unidades_medida(sigla)", { count: "exact" })
    .eq("ativo", true);

  if (params.busca) consulta = consulta.ilike("nome", `%${params.busca}%`);

  const { data, error, count } = await consulta
    .order("nome", { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const linhas = (data ?? []) as unknown as {
    id: string;
    nome: string;
    estoque_atual: number | null;
    unidades_medida?: { sigla: string | null }[] | null;
  }[];

  return {
    dados: linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      unidade: linha.unidades_medida?.[0]?.sigla ?? "",
      estoque_atual: Number(linha.estoque_atual ?? 0),
    })),
    total: count ?? linhas.length,
    pagina,
    paginas: Math.max(1, Math.ceil((count ?? linhas.length) / porPagina)),
  };
}

/** Lupa de departamentos (setor de destino). */
export async function buscarDepartamentos(params: {
  busca?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<Pagina<DepartamentoPesquisavel>> {
  const pagina = params.pagina ?? 1;
  const porPagina = params.porPagina ?? 5;

  let consulta = supabase
    .from("departamentos")
    .select("id, nome, sigla", { count: "exact" })
    .eq("ativo", true);

  if (params.busca) consulta = consulta.ilike("nome", `%${params.busca}%`);

  const { data, error, count } = await consulta
    .order("nome", { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1);

  if (error) throw new Error(error.message);

  const linhas = (data ?? []) as unknown as DepartamentoPesquisavel[];

  return {
    dados: linhas,
    total: count ?? linhas.length,
    pagina,
    paginas: Math.max(1, Math.ceil((count ?? linhas.length) / porPagina)),
  };
}
