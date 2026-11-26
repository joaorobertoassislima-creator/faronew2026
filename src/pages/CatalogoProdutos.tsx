import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Eye,
  FileSignature,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import ModalPesquisaCatalogo, {
  type ItemPesquisaCatalogo,
  type TipoPesquisaCatalogo,
} from "@/components/catalogo/ModalPesquisaCatalogo";
import ModalPesquisaItemPCA, {
  type ItemPCAPesquisa,
} from "@/components/pca/ModalPesquisaItemPCA";
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
  listarCategoriasPCA,
  listarContratosCatalogo,
  listarItensPCAContrato,
  listarProdutos,
  listarUnidadesMedidaCatalogo,
  type CategoriaPCA,
  type ContratoCatalogo,
  type DadosProduto,
  type ItemPCAContratoCatalogo,
  type ProdutoCatalogo,
  type UnidadeMedidaCatalogo,
} from "@/lib/catalogoProdutos";
import { useAuth } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";

const POR_PAGINA = 8;

interface LinhaProduto extends ProdutoCatalogo {
  categoriaCodigo: string | null;
  categoriaDescricao: string | null;
  unidadeSigla: string | null;
  unidadeNome: string | null;
  contratoNumero: string | null;
  contratoFornecedor: string | null;
  itemPCACodigo: string | null;
  itemPCADescricao: string | null;
}

export default function CatalogoProdutos() {
  const { toast } = useToast();
  const { usuario } = useAuth();

  const [produtos, setProdutos] = useState<LinhaProduto[]>([]);
  const [unidades, setUnidades] = useState<UnidadeMedidaCatalogo[]>([]);
  const [contratos, setContratos] = useState<ContratoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPCA[]>([]);
  const [itensPCA, setItensPCA] = useState<ItemPCAContratoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [pagina, setPagina] = useState(1);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroContrato, setFiltroContrato] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<ProdutoCatalogo | null>(null);
  const [visualizando, setVisualizando] = useState<LinhaProduto | null>(null);

  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [tipoPesquisa, setTipoPesquisa] = useState<TipoPesquisaCatalogo>("categoria");
  const [displayCategoria, setDisplayCategoria] = useState("");
  const [displayContrato, setDisplayContrato] = useState("");
  const [displayItemPCA, setDisplayItemPCA] = useState("");
  const [pesquisaItemPCAAberta, setPesquisaItemPCAAberta] = useState(false);

  const [form, setForm] = useState<DadosProduto>({
    nome: "",
    descricao: null,
    categoria_id: null,
    unidade_id: null,
    contrato_id: null,
    item_pca_id: null,
    saldo_licitado: 0,
    controla_lote: false,
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaProdutos, listaUnidades, listaContratos, listaCategorias, listaItensPCA] =
        await Promise.all([
          listarProdutos(),
          listarUnidadesMedidaCatalogo(),
          listarContratosCatalogo(),
          listarCategoriasPCA(),
          listarItensPCAContrato(),
        ]);
      setUnidades(listaUnidades);
      setContratos(listaContratos);
      setCategorias(listaCategorias);
      setItensPCA(listaItensPCA);
      setProdutos(listaProdutos.map((produto) => ({ ...produto }) as LinhaProduto));
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Erro ao carregar o catálogo.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const linhas = useMemo<LinhaProduto[]>(() => {
    return produtos.map((produto) => {
      const unidade = unidades.find((u) => u.id === produto.unidade_id) ?? null;
      const contrato = contratos.find((c) => c.id === produto.contrato_id) ?? null;
      const categoria = categorias.find((c) => c.id === produto.categoria_id) ?? null;
      const itemPCA = itensPCA.find((i) => i.id === produto.item_pca_id) ?? null;
      return {
        ...produto,
        categoriaCodigo: categoria?.codigo ?? null,
        categoriaDescricao: categoria?.descricao ?? null,
        unidadeSigla: unidade?.sigla ?? null,
        unidadeNome: unidade?.nome ?? null,
        contratoNumero: contrato?.numero ?? null,
        contratoFornecedor: contrato?.fornecedor ?? null,
        itemPCACodigo: itemPCA?.codigo ?? null,
        itemPCADescricao: itemPCA?.descricao ?? null,
      };
    });
  }, [produtos, unidades, contratos, categorias, itensPCA]);

  const filtradas = useMemo(() => {
    const nome = filtroNome.trim().toLowerCase();
    const categoria = filtroCategoria.trim().toLowerCase();
    const contrato = filtroContrato.trim().toLowerCase();
    return linhas.filter((linha) => {
      if (nome && !linha.nome.toLowerCase().includes(nome)) return false;
      if (categoria) {
        const alvo = `${linha.categoriaCodigo ?? ""} ${linha.categoriaDescricao ?? ""}`.toLowerCase();
        if (!alvo.includes(categoria)) return false;
      }
      if (contrato) {
        const alvo = `${linha.contratoNumero ?? ""} ${linha.contratoFornecedor ?? ""}`.toLowerCase();
        if (!alvo.includes(contrato)) return false;
      }
      return true;
    });
  }, [linhas, filtroNome, filtroCategoria, filtroContrato]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [filtroNome, filtroCategoria, filtroContrato]);

  function abrirNovo() {
    setEditando(null);
    setForm({
      nome: "",
      descricao: null,
      categoria_id: null,
      unidade_id: null,
      contrato_id: null,
      item_pca_id: null,
      saldo_licitado: 0,
      controla_lote: false,
    });
    setDisplayCategoria("");
    setDisplayContrato("");
    setDisplayItemPCA("");
    setFormAberto(true);
  }

  function abrirEdicao(produto: LinhaProduto) {
    setEditando(produto);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao,
      categoria_id: produto.categoria_id,
      unidade_id: produto.unidade_id,
      contrato_id: produto.contrato_id,
      item_pca_id: produto.item_pca_id,
      saldo_licitado: Number(produto.saldo_licitado ?? 0),
      controla_lote: Boolean(produto.controla_lote),
    });
    setDisplayCategoria(
      produto.categoriaCodigo
        ? `${produto.categoriaCodigo} - ${produto.categoriaDescricao ?? ""}`.trim()
        : "",
    );
    setDisplayContrato(
      produto.contratoNumero
        ? `Contrato ${produto.contratoNumero} - ${produto.contratoFornecedor ?? ""}`.trim()
        : "",
    );
    setDisplayItemPCA(
      produto.itemPCACodigo
        ? `${produto.itemPCACodigo} - ${produto.itemPCADescricao ?? ""}`.trim()
        : "",
    );
    setFormAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast("Informe o nome do produto.", "erro");
      return;
    }
    try {
      if (editando) {
        await atualizarProduto(editando.id, form);
        toast("Produto editado com sucesso!");
      } else {
        await criarProduto(form, usuario?.id ?? null);
        toast("Produto adicionado ao catálogo com sucesso!");
      }
      setFormAberto(false);
      await carregar();
    } catch (erro) {
      toast(
        erro instanceof Error
          ? erro.message
          : "Erro na operação. O registro pode estar vinculado a outras movimentações de estoque.",
        "erro",
      );
    }
  }

  async function remover(produto: ProdutoCatalogo) {
    if (!window.confirm("Tem certeza que deseja excluir este produto do catálogo?")) return;
    try {
      await excluirProduto(produto.id);
      toast("Produto excluído do catálogo com sucesso!");
      await carregar();
    } catch (erro) {
      toast(
        erro instanceof Error
          ? erro.message
          : "Erro na operação. O registro pode estar vinculado a outras movimentações de estoque.",
        "erro",
      );
    }
  }

  function abrirPesquisa(tipo: TipoPesquisaCatalogo) {
    setTipoPesquisa(tipo);
    setPesquisaAberta(true);
  }

  function selecionarPesquisa(item: ItemPesquisaCatalogo) {
    if (tipoPesquisa === "categoria") {
      setForm((atual) => ({ ...atual, categoria_id: item.id }));
      setDisplayCategoria(`${item.texto1} - ${item.texto2}`);
    } else {
      setForm((atual) => ({ ...atual, contrato_id: item.id }));
      setDisplayContrato(`${item.texto1} - ${item.texto2}`);
    }
  }

  function selecionarItemPCA(item: ItemPCAPesquisa) {
    setForm((atual) => ({ ...atual, item_pca_id: item.id }));
    setDisplayItemPCA(`${item.codigo} - ${item.descricao}`);
    setPesquisaItemPCAAberta(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Package className="h-6 w-6 text-primary" />
          Catálogo de Produtos
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
          <CardTitle className="text-base">Itens Vinculados (GesCON / ConPUB)</CardTitle>
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </CardHeader>
        <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              placeholder="Buscar produto pelo nome..."
              className="pl-9"
            />
          </div>
          <div className="relative">
            <Tags className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              placeholder="Filtrar por categoria (ConPUB)..."
              className="pl-9"
            />
          </div>
          <div className="relative">
            <FileSignature className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
              placeholder="Filtrar por contrato (GesCON)..."
              className="pl-9"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {carregando ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando catálogo...</p>
          ) : filtradas.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-border" />
              <h4 className="mb-1 font-medium">Nenhum produto cadastrado</h4>
              <p className="text-sm text-muted-foreground">
                Adicione o primeiro item ao catálogo vinculando-o ao ConPUB e GesCON.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Categoria (ConPUB)</th>
                      <th className="px-4 py-3">Contrato (GesCON)</th>
                      <th className="px-4 py-3">Item PCA (Nível 4)</th>
                      <th className="px-4 py-3">Saldo Original</th>
                      <th className="px-4 py-3">Controle de Lote</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((linha) => (
                      <tr key={linha.id} className="border-t border-border transition hover:bg-secondary/50">
                        <td className="px-4 py-3">
                          <span className="font-semibold">{linha.nome}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            ({linha.unidadeSigla ?? "-"})
                          </span>
                          {linha.descricao && (
                            <p className="mt-1 text-xs text-muted-foreground">{linha.descricao}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {linha.categoriaCodigo ? (
                            <>
                              <span className="inline-block rounded bg-sky-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-800">
                                {linha.categoriaCodigo}
                              </span>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {(linha.categoriaDescricao ?? "").slice(0, 30)}...
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não vinculado</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {linha.contratoNumero ? (
                            <>
                              <span className="flex items-center gap-1 font-semibold text-primary">
                                <FileSignature className="h-3.5 w-3.5" />
                                {linha.contratoNumero}
                              </span>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {(linha.contratoFornecedor ?? "").slice(0, 30)}...
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Compra Direta</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {linha.itemPCACodigo ? (
                            <>
                              <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                                {linha.itemPCACodigo}
                              </span>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {(linha.itemPCADescricao ?? "").slice(0, 30)}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não vinculado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatarMoeda(Number(linha.saldo_licitado ?? 0))} ({linha.unidadeSigla ?? "-"})
                        </td>
                        <td className="px-4 py-3">
                          {linha.controla_lote ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <CalendarClock className="h-3 w-3" />
                              FIFO/PEPS
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="Visualizar"
                              onClick={() => setVisualizando(linha)}
                              className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => abrirEdicao(linha)}
                              className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              onClick={() => void remover(linha)}
                              className="rounded-md border border-border p-1.5 text-destructive transition hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {visiveis.length} de {filtradas.length} registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="px-2 text-sm font-bold">
                    {paginaAtual} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {formAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFormAberto(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold">
              {editando ? "Editando Produto" : "Incluir Novo Produto"}
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Nome do Produto <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((atual) => ({ ...atual, nome: e.target.value }))}
                  placeholder="Ex: Notebook Lenovo 14"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unidade de Medida <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.unidade_id ?? ""}
                  onChange={(e) => setForm((atual) => ({ ...atual, unidade_id: e.target.value || null }))}
                >
                  <option value="">Selecione...</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.sigla ? `${unidade.sigla} - ` : ""}
                      {unidade.nome}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Vincular Contrato</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={displayContrato}
                    onClick={() => abrirPesquisa("contrato")}
                    placeholder="Pesquisar contrato..."
                    className="cursor-pointer bg-muted/40"
                  />
                  <Button type="button" onClick={() => abrirPesquisa("contrato")}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Item do PCA
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={displayItemPCA}
                    onClick={() => setPesquisaItemPCAAberta(true)}
                    placeholder="Clique na lupa para pesquisar o item do PCA..."
                    className="cursor-pointer bg-muted/40"
                  />
                  <Button type="button" onClick={() => setPesquisaItemPCAAberta(true)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ex.: 2.16.05.001 - Locação Poupatempo
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Saldo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.saldo_licitado}
                  onChange={(e) =>
                    setForm((atual) => ({ ...atual, saldo_licitado: Number(e.target.value) }))
                  }
                  placeholder="Ex: 1000.00"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.controla_lote}
                    onChange={(e) =>
                      setForm((atual) => ({ ...atual, controla_lote: e.target.checked }))
                    }
                    className="h-4 w-4 cursor-pointer"
                  />
                  Exige Controle de Lote/Validade
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Especificações Técnicas (Descrição)</label>
                <textarea
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm((atual) => ({ ...atual, descricao: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void salvar()}>
                Salvar Registro
              </Button>
            </div>
          </div>
        </div>
      )}

      {visualizando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setVisualizando(null)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Detalhes do Produto</h3>
              <button
                type="button"
                onClick={() => setVisualizando(null)}
                className="rounded-md border border-border p-1 text-muted-foreground transition hover:bg-secondary"
              >
                ✕
              </button>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <th className="w-[30%] px-2 py-2 text-left font-medium">Nome:</th>
                  <td className="px-2 py-2">{visualizando.nome}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Descrição:</th>
                  <td className="px-2 py-2">{visualizando.descricao || "-"}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Unidade:</th>
                  <td className="px-2 py-2">
                    {visualizando.unidadeNome
                      ? `${visualizando.unidadeNome} (${visualizando.unidadeSigla ?? ""})`
                      : "-"}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Categoria (PCA):</th>
                  <td className="px-2 py-2">
                    {visualizando.categoriaCodigo
                      ? `${visualizando.categoriaCodigo} - ${visualizando.categoriaDescricao ?? ""}`
                      : "Não vinculado"}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Contrato (ARP):</th>
                  <td className="px-2 py-2">
                    {visualizando.contratoNumero
                      ? `${visualizando.contratoNumero} - ${visualizando.contratoFornecedor ?? ""}`
                      : "Compra Direta"}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Item PCA (Nível 4):</th>
                  <td className="px-2 py-2">
                    {visualizando.itemPCACodigo
                      ? `${visualizando.itemPCACodigo} - ${visualizando.itemPCADescricao ?? ""}`
                      : "Não vinculado"}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">Saldo Licitado:</th>
                  <td className="px-2 py-2">{formatarMoeda(Number(visualizando.saldo_licitado ?? 0))}</td>
                </tr>
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Controle Lote:</th>
                  <td className="px-2 py-2">
                    {visualizando.controla_lote ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <CalendarClock className="h-3 w-3" />
                        Sim (FIFO/PEPS)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setVisualizando(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalPesquisaCatalogo
        tipo={tipoPesquisa}
        aberto={pesquisaAberta}
        aoFechar={() => setPesquisaAberta(false)}
        aoSelecionar={selecionarPesquisa}
      />

      <ModalPesquisaItemPCA
        aberto={pesquisaItemPCAAberta}
        aoFechar={() => setPesquisaItemPCAAberta(false)}
        aoSelecionar={selecionarItemPCA}
        titulo="Pesquisa de itens do PCA (nível 4)"
        descricao="Selecione o item do PCA (código contrato) que será vinculado ao produto do catálogo."
      />

      {filtroNome || filtroCategoria || filtroContrato ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Tags className="h-3.5 w-3.5" />
          Filtros aplicados:
          {filtroNome && <span className="rounded bg-muted px-2 py-0.5">Produto: {filtroNome}</span>}
          {filtroCategoria && (
            <span className="rounded bg-muted px-2 py-0.5">Categoria: {filtroCategoria}</span>
          )}
          {filtroContrato && (
            <span className="rounded bg-muted px-2 py-0.5">Contrato: {filtroContrato}</span>
          )}
          <button
            type="button"
            onClick={() => {
              setFiltroNome("");
              setFiltroCategoria("");
              setFiltroContrato("");
            }}
            className="underline hover:text-foreground"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}
