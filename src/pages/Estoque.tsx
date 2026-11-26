import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  CalendarClock,
  Package,
  Search,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import ModalPesquisaProdutoEstoque, {
  type ProdutoEscolha,
} from "@/components/estoque/ModalPesquisaProdutoEstoque";
import {
  listarBaixasEstoque,
  listarLotesDoProduto,
  listarLotesEstoque,
  listarProdutosEstoque,
  registrarBaixaAvulsa,
  type BaixaEstoque,
  type LoteEstoque,
  type ProdutoEstoqueCompleto,
} from "@/lib/estoque";
import { formatarDataHora, formatarDataISO, formatarMoeda } from "@/lib/format";

type Aba = "produtos" | "lotes" | "baixas";

const ABAS: { id: Aba; titulo: string; icone: typeof Boxes }[] = [
  { id: "produtos", titulo: "Saldo de Produtos", icone: Package },
  { id: "lotes", titulo: "Lotes e Validade", icone: CalendarClock },
  { id: "baixas", titulo: "Baixas Avulsas", icone: TrendingDown },
];

export default function Estoque() {
  const { toast } = useToast();

  const [aba, setAba] = useState<Aba>("produtos");
  const [carregando, setCarregando] = useState(true);

  const [produtos, setProdutos] = useState<ProdutoEstoqueCompleto[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [paginaProdutos, setPaginaProdutos] = useState(1);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [lotes, setLotes] = useState<LoteEstoque[]>([]);
  const [totalLotes, setTotalLotes] = useState(0);
  const [paginaLotes, setPaginaLotes] = useState(1);
  const [filtroLote, setFiltroLote] = useState("");
  const [filtroProdutoLote, setFiltroProdutoLote] = useState("");

  const [baixas, setBaixas] = useState<BaixaEstoque[]>([]);
  const [totalBaixas, setTotalBaixas] = useState(0);
  const [paginaBaixas, setPaginaBaixas] = useState(1);
  const [filtroProdutoBaixa, setFiltroProdutoBaixa] = useState("");

  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [produtoBaixa, setProdutoBaixa] = useState<ProdutoEscolha | null>(null);
  const [lotesDoProduto, setLotesDoProduto] = useState<LoteEstoque[]>([]);
  const [quantidade, setQuantidade] = useState("");
  const [loteSelecionado, setLoteSelecionado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarProdutos = useCallback(async () => {
    const resultado = await listarProdutosEstoque({
      nome: filtroNome,
      categoria: filtroCategoria,
      pagina: paginaProdutos,
    });
    setProdutos(resultado.itens);
    setTotalProdutos(resultado.total);
  }, [filtroNome, filtroCategoria, paginaProdutos]);

  const carregarLotes = useCallback(async () => {
    const resultado = await listarLotesEstoque({
      numeroLote: filtroLote,
      produto: filtroProdutoLote,
      pagina: paginaLotes,
    });
    setLotes(resultado.itens);
    setTotalLotes(resultado.total);
  }, [filtroLote, filtroProdutoLote, paginaLotes]);

  const carregarBaixas = useCallback(async () => {
    const resultado = await listarBaixasEstoque({
      produto: filtroProdutoBaixa,
      pagina: paginaBaixas,
    });
    setBaixas(resultado.itens);
    setTotalBaixas(resultado.total);
  }, [filtroProdutoBaixa, paginaBaixas]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const executar = async () => {
      try {
        if (aba === "produtos") await carregarProdutos();
        else if (aba === "lotes") await carregarLotes();
        else await carregarBaixas();
      } catch (erro) {
        toast(
          erro instanceof Error ? erro.message : "Erro ao carregar o estoque.",
          "erro",
        );
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };
    void executar();
    return () => {
      cancelado = true;
    };
  }, [aba, carregarProdutos, carregarLotes, carregarBaixas, toast]);

  useEffect(() => {
    setPaginaProdutos(1);
  }, [filtroNome, filtroCategoria]);

  useEffect(() => {
    setPaginaLotes(1);
  }, [filtroLote, filtroProdutoLote]);

  useEffect(() => {
    setPaginaBaixas(1);
  }, [filtroProdutoBaixa]);

  async function selecionarProdutoBaixa(produto: ProdutoEscolha) {
    setProdutoBaixa(produto);
    setQuantidade("");
    setLoteSelecionado("");
    setMotivo("");
    setLotesDoProduto([]);
    if (produto.controla_lote) {
      try {
        const lista = await listarLotesDoProduto(produto.id);
        setLotesDoProduto(lista);
      } catch (erro) {
        toast(
          erro instanceof Error ? erro.message : "Erro ao carregar os lotes do produto.",
          "erro",
        );
      }
    }
  }

  async function registrarBaixa() {
    if (!produtoBaixa) return;
    const qtd = Number(quantidade);
    if (!quantidade.trim() || Number.isNaN(qtd) || qtd <= 0) {
      toast("Informe uma quantidade válida para a baixa.", "erro");
      return;
    }
    if (qtd > produtoBaixa.estoque_atual) {
      toast("A quantidade informada é superior ao estoque disponível.", "erro");
      return;
    }
    if (produtoBaixa.controla_lote && !loteSelecionado) {
      toast("Selecione o lote do qual será feita a baixa.", "erro");
      return;
    }
    if (!motivo.trim()) {
      toast("Informe o motivo da baixa.", "erro");
      return;
    }
    setSalvando(true);
    try {
      await registrarBaixaAvulsa({
        produtoId: produtoBaixa.id,
        loteId: loteSelecionado || null,
        quantidade: qtd,
        motivo: motivo.trim(),
      });
      toast("Baixa registrada com sucesso!");
      setProdutoBaixa(null);
      await Promise.all([carregarProdutos(), carregarBaixas(), carregarLotes()]);
    } catch (erro) {
      toast(
        erro instanceof Error ? erro.message : "Erro ao registrar a baixa.",
        "erro",
      );
    } finally {
      setSalvando(false);
    }
  }

  const totalPaginasProdutos = Math.max(1, Math.ceil(totalProdutos / 8));
  const totalPaginasLotes = Math.max(1, Math.ceil(totalLotes / 8));
  const totalPaginasBaixas = Math.max(1, Math.ceil(totalBaixas / 8));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Boxes className="h-6 w-6 text-primary" />
          Estoque
        </h1>
        <Button onClick={() => setPesquisaAberta(true)}>
          <TrendingDown className="h-4 w-4" />
          Registrar Baixa
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((item) => {
          const Icone = item.icone;
          const ativa = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={
                ativa
                  ? "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition"
                  : "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              }
            >
              <Icone className="h-4 w-4" />
              {item.titulo}
            </button>
          );
        })}
      </div>

      {aba === "produtos" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
            <CardTitle className="text-base">Saldo de Produtos</CardTitle>
            <span className="text-xs text-muted-foreground">
              {totalProdutos} produto(s) com estoque
            </span>
          </CardHeader>
          <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-2">
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                placeholder="Filtrar por categoria..."
                className="pl-9"
              />
            </div>
          </div>
          <CardContent className="p-0">
            {carregando ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Carregando estoque...
              </p>
            ) : produtos.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="mx-auto mb-4 h-12 w-12 text-border" />
                <h4 className="mb-1 font-medium">Nenhum produto com estoque</h4>
                <p className="text-sm text-muted-foreground">
                  Os produtos vinculados ao catálogo aparecem aqui com o saldo disponível
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Estoque Atual</th>
                        <th className="px-4 py-3">Estoque Mínimo</th>
                        <th className="px-4 py-3">Saldo Licitado</th>
                        <th className="px-4 py-3">Situação</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map((produto) => {
                        const abaixoDoMinimo =
                          Number(produto.estoque_minimo ?? 0) > 0 &&
                          Number(produto.estoque_atual ?? 0) <=
                            Number(produto.estoque_minimo ?? 0);
                        return (
                          <tr
                            key={produto.id}
                            className="border-t border-border transition hover:bg-secondary/50"
                          >
                            <td className="px-4 py-3">
                              <span className="font-semibold">{produto.nome}</span>{" "}
                              <span className="text-xs text-muted-foreground">
                                ({produto.unidade_sigla ?? "-"})
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {produto.categoria_nome ?? "-"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-primary">
                              {produto.estoque_atual}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {produto.estoque_minimo}
                            </td>
                            <td className="px-4 py-3">
                              {formatarMoeda(Number(produto.saldo_licitado ?? 0))}
                            </td>
                            <td className="px-4 py-3">
                              {abaixoDoMinimo ? (
                                <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                  Abaixo do mínimo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  Normal
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  void selecionarProdutoBaixa({
                                    id: produto.id,
                                    nome: produto.nome,
                                    controla_lote: produto.controla_lote,
                                    estoque_atual: Number(produto.estoque_atual ?? 0),
                                    unidade_sigla: produto.unidade_sigla,
                                  });
                                }}
                              >
                                <TrendingDown className="h-3.5 w-3.5" />
                                Baixa
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {produtos.length} de {totalProdutos} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaginaProdutos((p) => Math.max(1, p - 1))}
                      disabled={paginaProdutos <= 1}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-sm font-bold">
                      {paginaProdutos} de {totalPaginasProdutos}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaProdutos((p) => Math.min(totalPaginasProdutos, p + 1))
                      }
                      disabled={paginaProdutos >= totalPaginasProdutos}
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
      )}

      {aba === "lotes" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
            <CardTitle className="text-base">Lotes e Validade</CardTitle>
            <span className="text-xs text-muted-foreground">
              {totalLotes} lote(s) com saldo
            </span>
          </CardHeader>
          <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroLote}
                onChange={(e) => setFiltroLote(e.target.value)}
                placeholder="Buscar pelo número do lote..."
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroProdutoLote}
                onChange={(e) => setFiltroProdutoLote(e.target.value)}
                placeholder="Buscar pelo produto..."
                className="pl-9"
              />
            </div>
          </div>
          <CardContent className="p-0">
            {carregando ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Carregando lotes...
              </p>
            ) : lotes.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarClock className="mx-auto mb-4 h-12 w-12 text-border" />
                <h4 className="mb-1 font-medium">Nenhum lote com saldo</h4>
                <p className="text-sm text-muted-foreground">
                  Os lotes aparecem aqui para os produtos com controle de lote/validade
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Lote</th>
                        <th className="px-4 py-3">Quantidade</th>
                        <th className="px-4 py-3">Validade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((lote) => (
                        <tr
                          key={lote.id}
                          className="border-t border-border transition hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold">{lote.produto_nome}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              ({lote.unidade_sigla ?? "-"})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">
                              {lote.numero_lote}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">
                            {lote.quantidade_atual}
                          </td>
                          <td className="px-4 py-3">
                            {lote.data_validade ? (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                                {formatarDataISO(lote.data_validade)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {lotes.length} de {totalLotes} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaginaLotes((p) => Math.max(1, p - 1))}
                      disabled={paginaLotes <= 1}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-sm font-bold">
                      {paginaLotes} de {totalPaginasLotes}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaginaLotes((p) => Math.min(totalPaginasLotes, p + 1))}
                      disabled={paginaLotes >= totalPaginasLotes}
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
      )}

      {aba === "baixas" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
            <CardTitle className="text-base">Baixas Avulsas</CardTitle>
            <span className="text-xs text-muted-foreground">
              {totalBaixas} baixa(s) registrada(s)
            </span>
          </CardHeader>
          <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroProdutoBaixa}
                onChange={(e) => setFiltroProdutoBaixa(e.target.value)}
                placeholder="Buscar pelo produto..."
                className="pl-9"
              />
            </div>
          </div>
          <CardContent className="p-0">
            {carregando ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Carregando baixas...
              </p>
            ) : baixas.length === 0 ? (
              <div className="p-12 text-center">
                <TrendingDown className="mx-auto mb-4 h-12 w-12 text-border" />
                <h4 className="mb-1 font-medium">Nenhuma baixa registrada</h4>
                <p className="text-sm text-muted-foreground">
                  Use o botão Registrar Baixa para movimentar o estoque
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Lote</th>
                        <th className="px-4 py-3">Quantidade</th>
                        <th className="px-4 py-3">Valor Unitário</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baixas.map((baixa) => (
                        <tr
                          key={baixa.id}
                          className="border-t border-border transition hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold">{baixa.produto_nome}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              ({baixa.unidade_sigla ?? "-"})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {baixa.numero_lote ? (
                              <span className="inline-block rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">
                                {baixa.numero_lote}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-destructive">
                            -{baixa.quantidade}
                          </td>
                          <td className="px-4 py-3">
                            {formatarMoeda(Number(baixa.valor_unitario ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {baixa.motivo_baixa ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatarDataHora(baixa.data_registro)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {baixas.length} de {totalBaixas} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaginaBaixas((p) => Math.max(1, p - 1))}
                      disabled={paginaBaixas <= 1}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-sm font-bold">
                      {paginaBaixas} de {totalPaginasBaixas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaginaBaixas((p) => Math.min(totalPaginasBaixas, p + 1))}
                      disabled={paginaBaixas >= totalPaginasBaixas}
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
      )}

      <ModalPesquisaProdutoEstoque
        open={pesquisaAberta}
        onClose={() => setPesquisaAberta(false)}
        onSelect={(produto) => {
          setPesquisaAberta(false);
          void selecionarProdutoBaixa(produto);
        }}
      />

      {produtoBaixa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setProdutoBaixa(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-semibold">Registrar Baixa de Estoque</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {produtoBaixa.nome} — disponível: {produtoBaixa.estoque_atual}{" "}
              {produtoBaixa.unidade_sigla ?? ""}
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Quantidade <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>

              {produtoBaixa.controla_lote && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Lote <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={loteSelecionado}
                    onChange={(e) => setLoteSelecionado(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione o lote...</option>
                    {lotesDoProduto.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.numero_lote} — {lote.quantidade_atual} disponível
                        {lote.data_validade
                          ? ` — validade ${formatarDataISO(lote.data_validade)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {lotesDoProduto.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Este produto não possui lotes com saldo disponível.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Motivo da baixa <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Informe o motivo da baixa..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProdutoBaixa(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={salvando} onClick={() => void registrarBaixa()}>
                {salvando ? "Registrando..." : "Confirmar Baixa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
