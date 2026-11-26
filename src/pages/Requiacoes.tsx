import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Eye,
  FileText,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { formatarDataHora } from "@/lib/format";
import ModalPesquisaDepartamentoRequisicao from "@/components/requisicoes/ModalPesquisaDepartamentoRequisicao";
import ModalPesquisaProdutoRequisicao from "@/components/requisicoes/ModalPesquisaProdutoRequisicao";
import Dialog from "@/components/ui/dialog";
import {
  aprovarRequisicao,
  atenderRequisicao,
  atualizarItemAtendido,
  criarRequisicao,
  excluirRequisicao,
  gerarNumeroRequisicao,
  listarItensRequisicao,
  listarRequisicoes,
  adicionarItemRequisicao,
  rejeitarRequisicao,
  rotuloStatus,
  STATUS_REQUISICAO,
  type DepartamentoPesquisavel,
  type ItemRequisicao,
  type ProdutoPesquisavel,
  type Requisicao,
} from "@/lib/requisicoes";

type Aba = "minhas" | "pendentes" | "atendimento";

interface ItemCarrinho {
  produto: ProdutoPesquisavel;
  quantidade: number;
}

function formatarNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function corStatus(status: string): string {
  switch (status) {
    case "pendente":
      return "bg-amber-50 text-amber-700";
    case "aprovada":
      return "bg-sky-50 text-sky-700";
    case "atendida":
      return "bg-emerald-50 text-emerald-700";
    case "cancelada":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Requisicoes() {
  const { toast } = useToast();
  const { usuario, perfil, papeis } = useAuth();

  const podeAprovar = papeis.includes("gestor_aprovador") || papeis.includes("administrador");
  const podeAtender = papeis.includes("almoxarife") || papeis.includes("administrador");

  const [aba, setAba] = useState<Aba>("minhas");
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroSolicitante, setFiltroSolicitante] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [modalNova, setModalNova] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [modalDepartamento, setModalDepartamento] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<Requisicao | null>(null);
  const [itensDetalhes, setItensDetalhes] = useState<ItemRequisicao[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [itemEmAtendimento, setItemEmAtendimento] = useState<ItemRequisicao | null>(null);
  const [quantidadeAtendida, setQuantidadeAtendida] = useState("");
  const [justificativaCorte, setJustificativaCorte] = useState("");

  const [departamento, setDepartamento] = useState<DepartamentoPesquisavel | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [processando, setProcessando] = useState(false);

  const statusFixo = useMemo(() => {
    if (aba === "pendentes") return "pendente";
    if (aba === "atendimento") return "aprovada";
    return "";
  }, [aba]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resultado = await listarRequisicoes({
        usuarioId: aba === "minhas" ? (usuario?.id ?? null) : null,
        status: statusFixo || filtroStatus || undefined,
        numero: filtroNumero.trim() || undefined,
        solicitante: filtroSolicitante.trim() || undefined,
        pagina,
        porPagina: 8,
      });
      setRequisicoes(resultado.dados);
      setTotal(resultado.total);
      setPaginas(resultado.paginas);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar requisições.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [aba, usuario?.id, statusFixo, filtroStatus, filtroNumero, filtroSolicitante, pagina, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function trocarAba(nova: Aba) {
    setAba(nova);
    setPagina(1);
    setFiltroStatus("");
    setFiltroNumero("");
    setFiltroSolicitante("");
  }

  function abrirNovaRequisicao() {
    setDepartamento(null);
    setObservacoes("");
    setCarrinho([]);
    setModalNova(true);
  }

  function adicionarProduto(produto: ProdutoPesquisavel) {
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (existente) {
        return atual.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }
      return [...atual, { produto, quantidade: 1 }];
    });
    setModalProduto(false);
    toast("Item adicionado à requisição.", "info");
  }

  function alterarQuantidadeCarrinho(produtoId: string, quantidade: number) {
    setCarrinho((atual) =>
      atual
        .map((item) =>
          item.produto.id === produtoId ? { ...item, quantidade: Math.max(1, quantidade) } : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  }

  async function salvarRequisicao() {
    if (!usuario) return;
    if (!departamento) {
      toast("Selecione o departamento/setor de destino.", "erro");
      return;
    }
    if (carrinho.length === 0) {
      toast("Adicione ao menos um item à requisição.", "erro");
      return;
    }

    setSalvando(true);
    try {
      const numero = await gerarNumeroRequisicao();
      const requisicaoId = await criarRequisicao({
        usuarioId: usuario.id,
        numero,
        solicitante: perfil?.nome ?? usuario.email ?? "Servidor",
        departamentoId: departamento.id,
        observacoes: observacoes.trim() || null,
      });

      for (const item of carrinho) {
        await adicionarItemRequisicao({
          requisicaoId,
          produtoId: item.produto.id,
          descricao: item.produto.nome,
          quantidade: item.quantidade,
          unidade: item.produto.unidade || null,
        });
      }

      setModalNova(false);
      setCarrinho([]);
      setPagina(1);
      toast(`Requisição ${numero} enviada para aprovação da chefia.`, "sucesso");
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao enviar a requisição.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function abrirDetalhes(requisicao: Requisicao) {
    setModalDetalhes(requisicao);
    setItensDetalhes([]);
    setCarregandoItens(true);
    try {
      const itens = await listarItensRequisicao(requisicao.id);
      setItensDetalhes(itens);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar os itens da requisição.", "erro");
    } finally {
      setCarregandoItens(false);
    }
  }

  async function acaoRequisicao(
    requisicao: Requisicao,
    acao: "aprovar" | "rejeitar" | "atender" | "excluir",
  ) {
    setProcessando(true);
    try {
      if (acao === "aprovar") {
        await aprovarRequisicao(requisicao.id, usuario?.id ?? "");
        toast(`Requisição ${requisicao.numero} aprovada.`, "sucesso");
      } else if (acao === "rejeitar") {
        await rejeitarRequisicao(requisicao.id);
        toast(`Requisição ${requisicao.numero} rejeitada.`, "sucesso");
      } else if (acao === "atender") {
        await atenderRequisicao(requisicao.id);
        toast(`Requisição ${requisicao.numero} marcada como atendida.`, "sucesso");
      } else {
        await excluirRequisicao(requisicao.id);
        toast(`Requisição ${requisicao.numero} excluída.`, "sucesso");
      }
      if (modalDetalhes?.id === requisicao.id) setModalDetalhes(null);
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao executar a ação.", "erro");
    } finally {
      setProcessando(false);
    }
  }

  function abrirAtendimento(item: ItemRequisicao) {
    setItemEmAtendimento(item);
    setQuantidadeAtendida(String(item.quantidade_atendida ?? item.quantidade).replace(".", ","));
    setJustificativaCorte(item.justificativa_corte ?? "");
  }

  async function salvarAtendimento() {
    if (!itemEmAtendimento) return;
    const quantidade = Number(quantidadeAtendidoTexto().replace(",", "."));
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      toast("Informe uma quantidade atendida válida.", "erro");
      return;
    }
    if (quantidade < itemEmAtendimento.quantidade && justificativaCorte.trim() === "") {
      toast("Informe a justificativa do corte parcial.", "erro");
      return;
    }

    setProcessando(true);
    try {
      await atualizarItemAtendido({
        itemId: itemEmAtendimento.id,
        quantidadeAtendida: quantidade,
        justificativaCorte: justificativaCorte.trim() || null,
      });
      setItemEmAtendimento(null);
      toast("Quantidade atendida registrada.", "sucesso");
      if (modalDetalhes) await abrirDetalhes(modalDetalhes);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao salvar a quantidade atendida.", "erro");
    } finally {
      setProcessando(false);
    }
  }

  function quantidadeAtendidoTexto(): string {
    return quantidadeAtendida.trim() === "" ? "0" : quantidadeAtendida;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requisições de Material</h1>
          <p className="text-sm text-muted-foreground">
            Solicitação de materiais do estoque, aprovação da chefia e atendimento do almoxarifado
          </p>
        </div>
        <Button onClick={abrirNovaRequisicao}>
          <Plus className="h-4 w-4" />
          Nova Requisição
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => trocarAba("minhas")}
          className={
            aba === "minhas"
              ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
              : "px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          }
        >
          Minhas Requisições
        </button>
        {podeAprovar && (
          <button
            type="button"
            onClick={() => trocarAba("pendentes")}
            className={
              aba === "pendentes"
                ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
                : "px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            }
          >
            Aprovações da Chefia
          </button>
        )}
        {podeAtender && (
          <button
            type="button"
            onClick={() => trocarAba("atendimento")}
            className={
              aba === "atendimento"
                ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
                : "px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            }
          >
            Atendimento do Almoxarifado
          </button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            {aba === "minhas"
              ? "Minhas Requisições"
              : aba === "pendentes"
                ? "Requisições Aguardando Aprovação"
                : "Requisições Aprovadas para Atendimento"}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{total} registro(s)</span>
        </CardHeader>

        <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroNumero}
              onChange={(e) => {
                setFiltroNumero(e.target.value);
                setPagina(1);
              }}
              placeholder="Filtrar por número..."
              className="pl-9"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroSolicitante}
              onChange={(e) => {
                setFiltroSolicitante(e.target.value);
                setPagina(1);
              }}
              placeholder="Filtrar por solicitante..."
              className="pl-9"
            />
          </div>
          {aba === "minhas" && (
            <select
              value={filtroStatus}
              onChange={(e) => {
                setFiltroStatus(e.target.value);
                setPagina(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Todas as situações</option>
              {STATUS_REQUISICAO.map((status) => (
                <option key={status.valor} value={status.valor}>
                  {status.rotulo}
                </option>
              ))}
            </select>
          )}
        </div>

        <CardContent className="p-0">
          {carregando ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Carregando requisições...
            </p>
          ) : requisicoes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-border" />
              <h4 className="mb-1 font-medium">Nenhuma requisição encontrada</h4>
              <p className="text-sm text-muted-foreground">
                {aba === "minhas"
                  ? "Clique em “Nova Requisição” para solicitar materiais ao almoxarifado."
                  : "Não há requisições nesta situação no momento."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Solicitante</th>
                      <th className="px-4 py-3">Departamento</th>
                      <th className="px-4 py-3">Situação</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisicoes.map((requisicao) => (
                      <tr
                        key={requisicao.id}
                        className="border-t border-border transition hover:bg-secondary/50"
                      >
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {requisicao.numero}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatarDataHora(requisicao.data_solicitacao)}
                        </td>
                        <td className="px-4 py-3">{requisicao.solicitante ?? "-"}</td>
                        <td className="px-4 py-3">{requisicao.departamento_nome ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${corStatus(
                              requisicao.status,
                            )}`}
                          >
                            {rotuloStatus(requisicao.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            size="icon"
                            variant="outline"
                            title="Visualizar requisição"
                            onClick={() => void abrirDetalhes(requisicao)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {aba === "pendentes" && podeAprovar && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2 text-emerald-700 hover:text-emerald-800"
                                disabled={processando}
                                onClick={() => void acaoRequisicao(requisicao, "aprovar")}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2 text-destructive hover:text-destructive"
                                disabled={processando}
                                onClick={() => void acaoRequisicao(requisicao, "rejeitar")}
                              >
                                <X className="h-3.5 w-3.5" />
                                Rejeitar
                              </Button>
                            </>
                          )}

                          {aba === "atendimento" && podeAtender && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2"
                              disabled={processando}
                              onClick={() => void acaoRequisicao(requisicao, "atender")}
                            >
                              <Package className="h-3.5 w-3.5" />
                              Concluir
                            </Button>
                          )}

                          {aba === "minhas" && requisicao.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 text-destructive hover:text-destructive"
                              disabled={processando}
                              onClick={() => void acaoRequisicao(requisicao, "excluir")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {requisicoes.length} de {total} registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="px-2 text-sm font-bold">
                    {pagina} de {paginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
                    disabled={pagina >= paginas}
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

      {/* Dialog: Nova Requisição */}
      <Dialog
        aberto={modalNova}
        titulo="Nova Requisição de Material"
        descricao="Informe o departamento de destino e adicione os itens solicitados."
        aoFechar={() => setModalNova(false)}
        largura="max-w-2xl"
        rodape={
          <>
            <Button variant="outline" onClick={() => setModalNova(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarRequisicao()} disabled={salvando}>
              {salvando ? "Enviando..." : "Enviar Requisição"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label>Departamento / Setor de destino</Label>
            {departamento ? (
              <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm font-medium">
                  {departamento.nome}
                  {departamento.sigla ? ` (${departamento.sigla})` : ""}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalDepartamento(true)}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="mt-1 w-full justify-start"
                onClick={() => setModalDepartamento(true)}
              >
                <Search className="h-4 w-4" />
                Selecionar departamento
              </Button>
            )}
          </div>

          <div>
            <Label>Itens solicitados</Label>
            <Button
              variant="outline"
              className="mt-1 w-full justify-start"
              onClick={() => setModalProduto(true)}
            >
              <Plus className="h-4 w-4" />
              Adicionar produto
            </Button>

            {carrinho.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum item adicionado à requisição.
              </p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-md border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2 w-32">Quantidade</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.map((item) => (
                      <tr key={item.produto.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          {item.produto.nome}
                          {item.produto.unidade ? ` (${item.produto.unidade})` : ""}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={item.quantidade}
                            onChange={(e) =>
                              alterarQuantidadeCarrinho(
                                item.produto.id,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Remover item"
                            onClick={() =>
                              setCarrinho((atual) =>
                                atual.filter((linha) => linha.produto.id !== item.produto.id),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="observacoes-requisicao">Observações</Label>
            <Textarea
              id="observacoes-requisicao"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Informações adicionais para a chefia e o almoxarifado..."
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog: Detalhes da Requisição */}
      <Dialog
        aberto={modalDetalhes !== null}
        titulo={`Requisição ${modalDetalhes?.numero ?? ""}`}
        descricao={
          modalDetalhes
            ? `Solicitante: ${modalDetalhes.solicitante ?? "-"} · Departamento: ${
                modalDetalhes.departamento_nome ?? "-"
              } · Data: ${formatarDataHora(modalDetalhes.data_solicitacao)}`
            : undefined
        }
        aoFechar={() => setModalDetalhes(null)}
        rodape={
          <Button variant="outline" onClick={() => setModalDetalhes(null)}>
            Fechar
          </Button>
        }
      >
        {carregandoItens ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Carregando itens...
          </p>
        ) : itensDetalhes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Esta requisição não possui itens.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Quantidade</th>
                  <th className="px-3 py-2">Atendido</th>
                  <th className="px-3 py-2">Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {itensDetalhes.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2">{item.descricao ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatarNumero(item.quantidade)}
                      {item.unidade ? ` ${item.unidade}` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {item.quantidade_atendida === null
                        ? "-"
                        : formatarNumero(item.quantidade_atendida)}
                    </td>
                    <td className="px-3 py-2">{item.justificativa_corte ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modalDetalhes?.observacoes && (
          <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <strong>Observações:</strong> {modalDetalhes.observacoes}
          </p>
        )}

        {modalDetalhes && aba === "atendimento" && podeAtender && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => void acaoRequisicao(modalDetalhes, "atender")}
              disabled={processando}
            >
              <Package className="h-3.5 w-3.5" />
              Concluir atendimento
            </Button>
          </div>
        )}
      </Dialog>

      {/* Dialog: Atendimento de item */}
      <Dialog
        aberto={itemEmAtendimento !== null}
        titulo="Registrar quantidade atendida"
        descricao={
          itemEmAtendimento
            ? `${itemEmAtendimento.descricao ?? "Item"} — solicitado: ${formatarNumero(
                itemEmAtendimento.quantidade,
              )}${itemEmAtendimento.unidade ? ` ${itemEmAtendimento.unidade}` : ""}`
            : undefined
        }
        aoFechar={() => setItemEmAtendimento(null)}
        largura="max-w-md"
        rodape={
          <>
            <Button
              variant="outline"
              onClick={() => setItemEmAtendimento(null)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button onClick={() => void salvarAtendimento()} disabled={processando}>
              {processando ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="quantidade-atendida">Quantidade atendida</Label>
            <Input
              id="quantidade-atendida"
              type="number"
              min={0}
              step="0.01"
              value={quantidadeAtendida}
              onChange={(e) => setQuantidadeAtendida(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="justificativa-corte">Justificativa do corte parcial</Label>
            <Textarea
              id="justificativa-corte"
              value={justificativaCorte}
              onChange={(e) => setJustificativaCorte(e.target.value)}
              rows={3}
              placeholder="Obrigatória quando a quantidade atendida for menor que a solicitada."
            />
          </div>
        </div>
      </Dialog>

      {/* Modais de pesquisa */}
      <ModalPesquisaDepartamentoRequisicao
        open={modalDepartamento}
        onClose={() => setModalDepartamento(false)}
        onSelect={(selecionado) => {
          setDepartamento(selecionado);
          setModalDepartamento(false);
          toast("Departamento selecionado.", "info");
        }}
      />

      <ModalPesquisaProdutoRequisicao
        open={modalProduto}
        onClose={() => setModalProduto(false)}
        onSelect={(produto) => adicionarProduto(produto)}
      />
    </div>
  );
}
