import { supabase } from "@/lib/supabase";

export const POR_PAGINA_ESTOQUE = 8;

export interface ProdutoEstoque {
  id: string;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  unidade_id: string | null;
  contrato_id: string | null;
  saldo_licitado: number;
  controla_lote: boolean;
  ativo: boolean;
  estoque_atual: number;
  estoque_minimo: number;
}

export interface ProdutoEstoqueCompleto extends ProdutoEstoque {
  categoria_nome: string | null;
  unidade_sigla: string | null;
}

export interface LoteEstoque {
  id: string;
  produto_id: string;
  numero_lote: string;
  quantidade_atual: number;
  data_validade: string | null;
  produto_nome?: string;
  unidade_sigla?: string | null;
}

export interface BaixaEstoque {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  valor_unitario: number | null;
  lote_id: string | null;
  motivo_baixa: string | null;
  usuario_id: string | null;
  data_registro: string;
  produto_nome?: string;
  unidade_sigla?: string | null;
  numero_lote?: string | null;
}

export interface ResultadoPaginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

interface CategoriaInfo {
  id: string;
  codigo: string;
  descricao: string;
}

function paginaVazia<T>(pagina: number): ResultadoPaginado<T> {
  return { itens: [], total: 0, pagina, totalPaginas: 1 };
}

function paginar<T>(itens: T[], pagina: number, porPagina: number): ResultadoPaginado<T> {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * porPagina;
  return {
    itens: itens.slice(inicio, inicio + porPagina),
    total,
    pagina: atual,
    totalPaginas,
  };
}

async function carregarCategorias(): Promise<CategoriaInfo[]> {
  const { data, error } = await supabase
    .from("pca_classes")
    .select("id, codigo, descricao");
  if (error) throw error;
  return (data ?? []) as CategoriaInfo[];
}

async function carregarUnidades(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("unidades_medida")
    .select("id, sigla");
  if (error) throw error;
  const mapa: Record<string, string> = {};
  for (const item of (data ?? []) as { id: string; sigla: string | null }[]) {
    mapa[item.id] = item.sigla ?? "";
  }
  return mapa;
}

export interface FiltroEstoque {
  nome?: string;
  categoria?: string;
  pagina?: number;
}

/** Lista os produtos ativos com o saldo fisico de estoque. */
export async function listarProdutosEstoque(
  filtro: FiltroEstoque = {},
): Promise<ResultadoPaginado<ProdutoEstoqueCompleto>> {
  const pagina = filtro.pagina ?? 1;
  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, nome, descricao, categoria_id, unidade_id, contrato_id, saldo_licitado, controla_lote, ativo, estoque_atual, estoque_minimo",
    )
    .eq("ativo", true)
    .limit(1000);
  if (error) throw error;

  const unidades = await carregarUnidades();
  const categorias = await carregarCategorias();
  const mapaCategoria = new Map(categorias.map((c) => [c.id, c]));

  const termoNome = (filtro.nome ?? "").trim().toLowerCase();
  const termoCategoria = (filtro.categoria ?? "").trim().toLowerCase();

  let itens: ProdutoEstoqueCompleto[] = ((data ?? []) as ProdutoEstoque[]).map((p) => {
    const categoria = p.categoria_id ? mapaCategoria.get(p.categoria_id) : undefined;
    return {
      ...p,
      saldo_licitado: Number(p.saldo_licitado ?? 0),
      estoque_atual: Number(p.estoque_atual ?? 0),
      estoque_minimo: Number(p.estoque_minimo ?? 0),
      categoria_nome: categoria
        ? `${categoria.codigo} - ${categoria.descricao}`
        : null,
      unidade_sigla: p.unidade_id ? (unidades[p.unidade_id] ?? null) : null,
    };
  });

  if (termoNome) {
    itens = itens.filter((p) => p.nome.toLowerCase().includes(termoNome));
  }
  if (termoCategoria) {
    itens = itens.filter(
      (p) => (p.categoria_nome ?? "").toLowerCase().includes(termoCategoria),
    );
  }

  itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return paginar(itens, pagina, POR_PAGINA_ESTOQUE);
}

export interface FiltroLotes {
  numeroLote?: string;
  produto?: string;
  pagina?: number;
}

/** Lista os lotes com saldo maior que zero, do vencimento mais proximo para o mais distante. */
export async function listarLotesEstoque(
  filtro: FiltroLotes = {},
): Promise<ResultadoPaginado<LoteEstoque>> {
  const pagina = filtro.pagina ?? 1;
  const { data, error } = await supabase
    .from("estoque_lotes")
    .select("id, produto_id, numero_lote, quantidade_atual, data_validade")
    .gt("quantidade_atual", 0)
    .limit(2000);
  if (error) throw error;

  const lotes = (data ?? []) as LoteEstoque[];
  const nomes = await mapaNomesProdutos(lotes.map((l) => l.produto_id));
  const unidades = await carregarUnidades();

  const termoNumero = (filtro.numeroLote ?? "").trim().toLowerCase();
  const termoProduto = (filtro.produto ?? "").trim().toLowerCase();

  let itens: LoteEstoque[] = lotes.map((l) => {
    const produto = nomes.get(l.produto_id);
    return {
      ...l,
      quantidade_atual: Number(l.quantidade_atual ?? 0),
      produto_nome: produto?.nome ?? "",
      unidade_sigla: produto?.unidade_id ? (unidades[produto.unidade_id] ?? null) : null,
    };
  });

  if (termoNumero) {
    itens = itens.filter((l) => l.numero_lote.toLowerCase().includes(termoNumero));
  }
  if (termoProduto) {
    itens = itens.filter((l) => (l.produto_nome ?? "").toLowerCase().includes(termoProduto));
  }

  itens.sort((a, b) => {
    if (!a.data_validade) return 1;
    if (!b.data_validade) return -1;
    return a.data_validade.localeCompare(b.data_validade);
  });
  return paginar(itens, pagina, POR_PAGINA_ESTOQUE);
}

export interface FiltroBaixas {
  produto?: string;
  pagina?: number;
}

/** Lista o historico de baixas avulsas registradas. */
export async function listarBaixasEstoque(
  filtro: FiltroBaixas = {},
): Promise<ResultadoPaginado<BaixaEstoque>> {
  const pagina = filtro.pagina ?? 1;
  const { data, error } = await supabase
    .from("estoque_movimentacoes")
    .select(
      "id, produto_id, tipo, quantidade, valor_unitario, lote_id, motivo_baixa, usuario_id, data_registro",
    )
    .eq("tipo", "baixa_avulsa")
    .order("data_registro", { ascending: false })
    .limit(2000);
  if (error) throw error;

  const baixas = (data ?? []) as BaixaEstoque[];
  const nomes = await mapaNomesProdutos(baixas.map((b) => b.produto_id));
  const unidades = await carregarUnidades();

  const { data: lotes } = await supabase
    .from("estoque_lotes")
    .select("id, numero_lote")
    .limit(2000);
  const mapaLote = new Map(
    ((lotes ?? []) as { id: string; numero_lote: string }[]).map((l) => [l.id, l.numero_lote]),
  );

  const termoProduto = (filtro.produto ?? "").trim().toLowerCase();

  let itens: BaixaEstoque[] = baixas.map((b) => {
    const produto = nomes.get(b.produto_id);
    return {
      ...b,
      quantidade: Number(b.quantidade ?? 0),
      produto_nome: produto?.nome ?? "",
      unidade_sigla: produto?.unidade_id ? (unidades[produto.unidade_id] ?? null) : null,
      numero_lote: b.lote_id ? (mapaLote.get(b.lote_id) ?? null) : null,
    };
  });

  if (termoProduto) {
    itens = itens.filter((b) => (b.produto_nome ?? "").toLowerCase().includes(termoProduto));
  }

  return paginar(itens, pagina, POR_PAGINA_ESTOQUE);
}

interface ProdutoResumo {
  id: string;
  nome: string;
  unidade_id: string | null;
}

async function mapaNomesProdutos(ids: string[]): Promise<Map<string, ProdutoResumo>> {
  const mapa = new Map<string, ProdutoResumo>();
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (unicos.length === 0) return mapa;

  for (let i = 0; i < unicos.length; i += 100) {
    const fatia = unicos.slice(i, i + 100);
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, unidade_id")
      .in("id", fatia);
    if (error) throw error;
    for (const item of (data ?? []) as ProdutoResumo[]) {
      mapa.set(item.id, item);
    }
  }
  return mapa;
}

/** Lotes com saldo de um produto especifico (usado na modal de baixa). */
export async function listarLotesDoProduto(produtoId: string): Promise<LoteEstoque[]> {
  const { data, error } = await supabase
    .from("estoque_lotes")
    .select("id, produto_id, numero_lote, quantidade_atual, data_validade")
    .eq("produto_id", produtoId)
    .gt("quantidade_atual", 0)
    .order("data_validade", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LoteEstoque[]).map((l) => ({
    ...l,
    quantidade_atual: Number(l.quantidade_atual ?? 0),
  }));
}

/** Registra a baixa avulsa e atualiza o saldo do produto e do lote em uma unica transacao. */
export async function registrarBaixaAvulsa(params: {
  produtoId: string;
  loteId: string | null;
  quantidade: number;
  motivo: string;
}): Promise<void> {
  const { error } = await supabase.rpc("registrar_baixa_avulsa", {
    p_produto_id: params.produtoId,
    p_lote_id: params.loteId,
    p_quantidade: params.quantidade,
    p_motivo: params.motivo,
  });
  if (error) throw error;
}
