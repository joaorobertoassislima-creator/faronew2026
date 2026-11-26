import { supabase } from "./supabase";

export interface ResultadoListagem<T> {
  registros: T[];
  total: number;
  totalPaginas: number;
  pagina: number;
}

export interface EntradaRegistro {
  id: string;
  produto_id: string;
  produto_nome: string;
  unidade_sigla: string | null;
  quantidade: number;
  valor_unitario: number | null;
  nota_fiscal: string | null;
  data_registro: string;
  lote_id: string | null;
  numero_lote: string | null;
  data_validade: string | null;
  contrato_id: string | null;
  contrato_numero: string | null;
  contrato_fornecedor: string | null;
}

export interface ProdutoEntrada {
  id: string;
  nome: string;
  unidade_id: string | null;
  unidade_sigla: string | null;
  controla_lote: boolean;
  estoque_atual: number;
}

export interface ContratoEntrada {
  id: string;
  numero: string;
  fornecedor: string;
  objeto: string | null;
}

export interface DadosEntrada {
  produto_id?: string;
  produtoId?: string;
  quantidade?: number;
  valor_unitario?: number;
  valorUnitario?: number;
  nota_fiscal?: string;
  notaFiscal?: string;
  contrato_id?: string | null;
  contratoId?: string | null;
  numero_lote?: string | null;
  numeroLote?: string | null;
  data_validade?: string | null;
  dataValidade?: string | null;
  /** Sigla da unidade de medida do produto (ex.: UN, KG, L). */
  unidade?: string | null;
  /** Número do contrato vinculado à entrada (ex.: 205/2019). */
  contratoNumero?: string | null;
  /** Nome do fornecedor do contrato vinculado. */
  contratoFornecedor?: string | null;
}

type ListaHibrida<T> = T[] & ResultadoListagem<T> & { data: T[] };

function comoLista<T>(registros: T[]): ListaHibrida<T> {
  const lista = registros as ListaHibrida<T>;
  lista.registros = registros;
  lista.data = registros;
  lista.total = registros.length;
  lista.totalPaginas = 1;
  lista.pagina = 1;
  return lista;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function paraNumero(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const limpo = valor.replace(/[^0-9,.-]/g, "").replace(",", ".");
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : 0;
  }
  return 0;
}

/** Lista o histórico de entradas com paginação e filtros por produto e nota fiscal. */
export async function listarEntradas(
  pagina = 1,
  filtroProduto = "",
  filtroNotaFiscal = "",
): Promise<ResultadoListagem<EntradaRegistro>> {
  const paginaAtual = Math.max(1, pagina);
  const tamanhoPagina = 8;

  let consulta = supabase
    .from("estoque_movimentacoes")
    .select(
      "id, produto_id, quantidade, valor_unitario, nota_fiscal, data_registro, lote_id, contrato_id, produtos(nome, unidades_medida(sigla)), estoque_lotes(numero_lote, data_validade), contratos(numero, fornecedor)",
      { count: "exact" },
    )
    .eq("tipo", "entrada")
    .order("data_registro", { ascending: false })
    .range((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina - 1);

  if (texto(filtroProduto) !== "") {
    consulta = consulta.ilike("produtos.nome", `%${texto(filtroProduto)}%`);
  }
  if (texto(filtroNotaFiscal) !== "") {
    consulta = consulta.ilike("nota_fiscal", `%${texto(filtroNotaFiscal)}%`);
  }

  const { data, error, count } = await consulta;
  if (error) throw new Error(error.message);

  const registros: EntradaRegistro[] = (data ?? []).map((linha: any) => ({
    id: linha.id,
    produto_id: linha.produto_id,
    produto_nome: linha.produtos?.nome ?? "",
    unidade_sigla: linha.produtos?.unidades_medida?.sigla ?? null,
    quantidade: paraNumero(linha.quantidade),
    valor_unitario: linha.valor_unitario === null ? null : paraNumero(linha.valor_unitario),
    nota_fiscal: linha.nota_fiscal ?? null,
    data_registro: linha.data_registro,
    lote_id: linha.lote_id ?? null,
    numero_lote: linha.estoque_lotes?.numero_lote ?? null,
    data_validade: linha.estoque_lotes?.data_validade ?? null,
    contrato_id: linha.contrato_id ?? null,
    contrato_numero: linha.contratos?.numero ?? null,
    contrato_fornecedor: linha.contratos?.fornecedor ?? null,
  }));

  const total = count ?? registros.length;
  return {
    registros,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / tamanhoPagina)),
    pagina: paginaAtual,
  };
}

/** Produtos ativos para vinculação na entrada de material. */
export async function listarProdutosAtivos(
  busca = "",
  pagina = 1,
): Promise<ListaHibrida<ProdutoEntrada>> {
  const tamanhoPagina = 5;

  let consulta = supabase
    .from("produtos")
    .select("id, nome, unidade_id, controla_lote, estoque_atual, unidades_medida(sigla)")
    .eq("ativo", true)
    .order("nome")
    .range((pagina - 1) * tamanhoPagina, pagina * tamanhoPagina - 1);

  if (texto(busca) !== "") {
    consulta = consulta.ilike("nome", `%${texto(busca)}%`);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  const registros: ProdutoEntrada[] = (data ?? []).map((linha: any) => ({
    id: linha.id,
    nome: linha.nome,
    unidade_id: linha.unidade_id ?? null,
    unidade_sigla: linha.unidades_medida?.sigla ?? null,
    controla_lote: Boolean(linha.controla_lote),
    estoque_atual: paraNumero(linha.estoque_atual),
  }));

  return comoLista(registros);
}

/** Contratos vigentes para vinculação da entrada (empenho). */
export async function listarContratosParaVinculo(
  busca = "",
  pagina = 1,
): Promise<ListaHibrida<ContratoEntrada>> {
  const tamanhoPagina = 5;

  let consulta = supabase
    .from("contratos")
    .select("id, numero, fornecedor, objeto")
    .order("numero")
    .range((pagina - 1) * tamanhoPagina, pagina * tamanhoPagina - 1);

  if (texto(busca) !== "") {
    consulta = consulta.or(`numero.ilike.%${texto(busca)}%,fornecedor.ilike.%${texto(busca)}%`);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  const registros: ContratoEntrada[] = (data ?? []).map((linha: any) => ({
    id: linha.id,
    numero: linha.numero,
    fornecedor: linha.fornecedor,
    objeto: linha.objeto ?? null,
  }));

  return comoLista(registros);
}

/** Registra a entrada de material (cria lote quando o produto controla lote). */
export async function registrarEntrada(dados: DadosEntrada): Promise<void> {
  const produtoId = dados.produto_id ?? dados.produtoId ?? null;
  const quantidade = paraNumero(dados.quantidade);
  const valorUnitario = paraNumero(dados.valor_unitario ?? dados.valorUnitario);
  const notaFiscal = dados.nota_fiscal ?? dados.notaFiscal ?? "";
  const contratoId = dados.contrato_id ?? dados.contratoId ?? null;
  const numeroLote = dados.numero_lote ?? dados.numeroLote ?? "";
  const dataValidade = dados.data_validade ?? dados.dataValidade ?? null;

  if (!produtoId) throw new Error("Selecione um produto.");
  if (quantidade <= 0) throw new Error("Informe uma quantidade maior que zero.");

  const { error } = await supabase.rpc("registrar_entrada_estoque", {
    p_produto_id: produtoId,
    p_quantidade: quantidade,
    p_valor_unitario: valorUnitario,
    p_nota_fiscal: notaFiscal,
    p_contrato_id: contratoId,
    p_numero_lote: numeroLote,
    p_data_validade: dataValidade,
  });

  if (error) throw new Error(error.message);
}

/** Estorna a entrada: abate o estoque e remove o registro. */
export async function estornarEntrada(id: string): Promise<void> {
  const { error } = await supabase.rpc("estornar_entrada_estoque", { p_id: id });
  if (error) throw new Error(error.message);
}
