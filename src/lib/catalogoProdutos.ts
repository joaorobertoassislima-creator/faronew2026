/**
 * Catálogo de Produtos (GesCON / ConPUB).
 *
 * Itens do catálogo vinculados às classes do PCA (ConPUB), aos contratos (GesCON),
 * às unidades de medida e aos itens de nível 4 do PCA (item código contrato).
 */

import { supabase } from "./supabase";

export interface ProdutoCatalogo {
  id: string;
  usuario_id: string | null;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  unidade_id: string | null;
  contrato_id: string | null;
  item_pca_id: string | null;
  saldo_licitado: number;
  controla_lote: boolean;
  ativo: boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface CategoriaPCA {
  id: string;
  codigo: string;
  descricao: string;
}

export interface ContratoCatalogo {
  id: string;
  numero: string;
  fornecedor: string;
  objeto?: string | null;
}

export interface UnidadeMedidaCatalogo {
  id: string;
  nome: string;
  sigla: string | null;
}

/** Item de nível 4 do PCA (item código contrato) usado como vínculo do produto. */
export interface ItemPCAContratoCatalogo {
  id: string;
  codigo: string;
  descricao: string;
  classe_id: string;
  contrato_id: string | null;
}

export interface DadosProduto {
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  unidade_id: string | null;
  contrato_id: string | null;
  item_pca_id: string | null;
  saldo_licitado: number;
  controla_lote: boolean;
}

function mensagemErro(erro: { message: string } | null, padrao: string): Error {
  return new Error(erro?.message ?? padrao);
}

/** Lista os produtos do catálogo com os dados relacionados. */
export async function listarProdutos(): Promise<ProdutoCatalogo[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw mensagemErro(error, "Erro ao carregar os produtos do catálogo.");
  return (data ?? []) as ProdutoCatalogo[];
}

/** Lista as classes do PCA (ConPUB) usadas como categoria do produto. */
export async function listarCategoriasPCA(): Promise<CategoriaPCA[]> {
  const { data, error } = await supabase
    .from("pca_classes")
    .select("id, codigo, descricao")
    .order("codigo", { ascending: true });
  if (error) throw mensagemErro(error, "Erro ao carregar as categorias do PCA.");
  return (data ?? []) as CategoriaPCA[];
}

/** Lista os contratos ativos/vigentes para o vínculo com o produto. */
export async function listarContratosCatalogo(): Promise<ContratoCatalogo[]> {
  const { data, error } = await supabase
    .from("contratos")
    .select("id, numero, fornecedor, objeto")
    .in("status", ["ativo", "vigente"])
    .order("numero", { ascending: true });
  if (error) throw mensagemErro(error, "Erro ao carregar os contratos.");
  return (data ?? []) as ContratoCatalogo[];
}

/** Lista as unidades de medida ativas. */
export async function listarUnidadesMedidaCatalogo(): Promise<UnidadeMedidaCatalogo[]> {
  const { data, error } = await supabase
    .from("unidades_medida")
    .select("id, nome, sigla")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw mensagemErro(error, "Erro ao carregar as unidades de medida.");
  return (data ?? []) as UnidadeMedidaCatalogo[];
}

/** Lista os itens de nível 4 do PCA (item código contrato) para o vínculo do produto. */
export async function listarItensPCAContrato(): Promise<ItemPCAContratoCatalogo[]> {
  const { data, error } = await supabase
    .from("pca_itens_contrato")
    .select("id, codigo, descricao, classe_id, contrato_id")
    .order("codigo", { ascending: true });
  if (error) throw mensagemErro(error, "Erro ao carregar os itens do PCA.");
  return (data ?? []) as ItemPCAContratoCatalogo[];
}

/** Cria um novo produto no catálogo. */
export async function criarProduto(
  dados: DadosProduto,
  usuarioId: string | null,
): Promise<ProdutoCatalogo> {
  const { data, error } = await supabase
    .from("produtos")
    .insert({ ...dados, usuario_id: usuarioId })
    .select("*")
    .single();
  if (error) throw mensagemErro(error, "Erro ao salvar o produto.");
  return data as ProdutoCatalogo;
}

/** Atualiza um produto existente. */
export async function atualizarProduto(id: string, dados: DadosProduto): Promise<ProdutoCatalogo> {
  const { data, error } = await supabase
    .from("produtos")
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw mensagemErro(error, "Erro ao atualizar o produto.");
  return data as ProdutoCatalogo;
}

/** Exclui um produto do catálogo. */
export async function excluirProduto(id: string): Promise<void> {
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) throw mensagemErro(error, "Erro ao excluir o produto.");
}
