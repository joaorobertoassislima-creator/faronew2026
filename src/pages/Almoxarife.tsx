import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Boxes,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  History,
  Lock,
  PackageOpen,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { formatarDataHora } from "@/lib/format";
import {
  atenderRequisicaoAlmoxarife,
  listarFilaSeparacao,
  listarHistoricoAtendimentos,
  listarItensAtendimento,
  rejeitarRequisicaoAlmoxarife,
  type ItemAtendimento,
  type RequisicaoAlmoxarife,
} from "@/lib/almoxarife";

type Aba = "fila" | "historico";

function formatarNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "-";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function rotuloStatus(status: string): string {
  switch (status) {
    case "atendida":
      return "Atendida";
    case "cancelada":
      return "Negada/Cancelada";
    case "aprovada":
      return "Aprovada (Fila)";
    default:
      return status;
  }
}

function classesStatus(status: string): string {
  switch (status) {
    case "atendida":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelada":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "aprovada":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Caixinha de filtro exibida no cabeçalho da coluna, como no modelo original. */
function FiltroColuna({
  ativo,
  onAplicar,
  onLimpar,
}: {
  ativo: boolean;
  onAplicar: (valor: string) => void;
  onLimpar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");

  function aplicar() {
    onAplicar(texto.trim());
    setAberto(false);
  }

  function limpar() {
    setTexto("");
    onLimpar();
    setAberto(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Filtrar coluna"
        onClick={(evento) => {
          evento.stopPropagation();
          setAberto((valor) => !valor);
        }}
        className={`ml-1 transition-colors ${
          ativo ? "text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
      </button>
      {aberto && (
        <span
          onClick={(evento) => evento.stopPropagation()}
          className="absolute left-0 top-full z-30 mt-1 w-56 cursor-default rounded-md border border-border bg-card p-3 text-left shadow-lg"
        >
          <span className="block text-xs font-semibold text-foreground">Filtrar</span>
          <label className="mt-2 block text-xs text-muted-foreground">Contém:</label>
          <Input
            autoFocus
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") aplicar();
            }}
            className="mt-1 h-8 text-xs"
          />
          <span className="mt-3 flex items-center justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={limpar}>
              Limpar
            </Button>
            <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={aplicar}>
              Aplicar
            </Button>
          </span>
        </span>
      )}
    </span>
  );
}

export default function Almoxarife() {
  const { toast } = useToast();
  const { usuario, papeis } = useAuth();

  const podeAcessar = papeis.includes("almoxarife") || papeis.includes("administrador");

  const [aba, setAba] = useState<Aba>("fila");
  const [carregando, setCarregando] = useState(true);

  const [fila, setFila] = useState<RequisicaoAlmoxarife[]>([]);
  const [totalFila, setTotalFila] = useState(0);
  const [paginasFila, setPaginasFila] = useState(1);
  const [paginaFila, setPaginaFila] = useState(1);
  const [filtroProtocoloFila, setFiltroProtocoloFila] = useState("");
  const [filtroSolicitanteFila, setFiltroSolicitanteFila] = useState("");

  const [historico, setHistorico] = useState<RequisicaoAlmoxarife[]>([]);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [paginasHistorico, setPaginasHistorico] = useState(1);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [filtroProtocoloHistorico, setFiltroProtocoloHistorico] = useState("");
  const [filtroSetorHistorico, setFiltroSetorHistorico] = useState("");

  const [requisicaoAtendimento, setRequisicaoAtendimento] = useState<RequisicaoAlmoxarife | null>(null);
  const [itensAtendimento, setItensAtendimento] = useState<ItemAtendimento[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [processando, setProcessando] = useState(false);

  const [requisicaoVisualizacao, setRequisicaoVisualizacao] = useState<RequisicaoAlmoxarife | null>(null);
  const [itensVisualizacao, setItensVisualizacao] = useState<ItemAtendimento[]>([]);
  const [carregandoVisualizacao, setCarregandoVisualizacao] = useState(false);

  const usuarioId = usuario?.id ?? null;

  const carregarFila = useCallback(async () => {
    const resultado = await listarFilaSeparacao({
      numero: filtroProtocoloFila || undefined,
      solicitante: filtroSolicitanteFila || undefined,
      pagina: paginaFila,
      porPagina: 8,
    });
    setFila(resultado.dados);
    setTotalFila(resultado.total);
    setPaginasFila(resultado.paginas);
  }, [filtroProtocoloFila, filtroSolicitanteFila, paginaFila]);

  const carregarHistorico = useCallback(async () => {
    if (!usuarioId) return;
    const resultado = await listarHistoricoAtendimentos({
      almoxarifeId: usuarioId,
      numero: filtroProtocoloHistorico || undefined,
      setor: filtroSetorHistorico || undefined,
      pagina: paginaHistorico,
      porPagina: 8,
    });
    setHistorico(resultado.dados);
    setTotalHistorico(resultado.total);
    setPaginasHistorico(resultado.paginas);
  }, [usuarioId, filtroProtocoloHistorico, filtroSetorHistorico, paginaHistorico]);

  useEffect(() => {
    if (!podeAcessar) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    (async () => {
      try {
        if (aba === "fila") await carregarFila();
        else await carregarHistorico();
      } catch (erro) {
        toast(erro instanceof Error ? erro.message : "Erro ao carregar os dados.", "erro");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [aba, podeAcessar, carregarFila, carregarHistorico, toast]);

  function trocarAba(nova: Aba) {
    setAba(nova);
    if (nova === "fila") setPaginaFila(1);
    else setPaginaHistorico(1);
  }

  async function abrirAtendimento(requisicao: RequisicaoAlmoxarife) {
    setRequisicaoAtendimento(requisicao);
    setCarregandoItens(true);
    setItensAtendimento([]);
    setQuantidades({});
    setJustificativas({});
    try {
      const itens = await listarItensAtendimento(requisicao.id);
      setItensAtendimento(itens);
      const iniciais: Record<string, string> = {};
      itens.forEach((item) => {
        iniciais[item.id] = String(item.quantidade ?? 0).replace(".", ",");
      });
      setQuantidades(iniciais);
      setJustificativas({});
      toast("Verifique o estoque e defina a quantidade real a ser entregue.", "info");
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Erro ao carregar os itens.", "erro");
      setRequisicaoAtendimento(null);
    } finally {
      setCarregandoItens(false);
    }
  }

  async function confirmarAtendimento() {
    if (!requisicaoAtendimento || !usuarioId) return;

    const itens = itensAtendimento.map((item) => {
      const texto = (quantidades[item.id] ?? "").replace(",", ".");
      const quantidadeAtendida = Number.isFinite(Number(texto)) ? Number(texto) : 0;
      return {
        id: item.id,
        quantidadeAtendida,
        justificativa: justificativas[item.id] ?? "",
      };
    });

    const invalido = itens.find((item) => item.quantidadeAtendida < 0);
    if (invalido) {
      toast("Informe quantidades atendidas válidas.", "erro");
      return;
    }

    setProcessando(true);
    try {
      await atenderRequisicaoAlmoxarife({
        requisicaoId: requisicaoAtendimento.id,
        almoxarifeId: usuarioId,
        itens,
      });
      toast("Separação concluída! Estoque atualizado com sucesso.", "sucesso");
      setRequisicaoAtendimento(null);
      await carregarFila();
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Erro ao confirmar a baixa.", "erro");
    } finally {
      setProcessando(false);
    }
  }

  async function negar(requisicao: RequisicaoAlmoxarife) {
    const confirmado = window.confirm(
      "Tem certeza que deseja NEGAR e cancelar esta requisição?",
    );
    if (!confirmado) {
      toast("Ação cancelada. Operação mantida na fila.", "info");
      return;
    }
    if (!usuarioId) return;
    setProcessando(true);
    try {
      await rejeitarRequisicaoAlmoxarife(requisicao.id, usuarioId);
      toast("Requisição negada e cancelada pelo Almoxarifado.", "sucesso");
      await carregarFila();
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Erro ao negar a requisição.", "erro");
    } finally {
      setProcessando(false);
    }
  }

  async function abrirVisualizacao(requisicao: RequisicaoAlmoxarife) {
    setRequisicaoVisualizacao(requisicao);
    setCarregandoVisualizacao(true);
    setItensVisualizacao([]);
    try {
      const itens = await listarItensAtendimento(requisicao.id);
      setItensVisualizacao(itens);
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Erro ao carregar os itens.", "erro");
      setRequisicaoVisualizacao(null);
    } finally {
      setCarregandoVisualizacao(false);
    }
  }

  if (!podeAcessar) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Lock className="h-16 w-16 text-rose-600" />
            <h3 className="text-lg font-semibold text-foreground">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground">
              Apenas Almoxarifes e Administradores têm acesso ao Painel de Separação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Boxes className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Painel do Almoxarifado</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="flex border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={() => trocarAba("fila")}
            className={`flex items-center gap-2 border-b-[3px] px-6 py-4 text-sm font-semibold transition-colors ${
              aba === "fila"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-primary"
            }`}
          >
            <Truck className="h-4 w-4" />
            Fila de Separação
            {totalFila > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {totalFila}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => trocarAba("historico")}
            className={`flex items-center gap-2 border-b-[3px] px-6 py-4 text-sm font-semibold transition-colors ${
              aba === "historico"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-primary"
            }`}
          >
            <History className="h-4 w-4" />
            Histórico de Atendimentos
          </button>
        </div>

        <CardContent className="p-0">
          {aba === "fila" ? (
            <>
              <h3 className="px-6 pt-6 text-base font-semibold text-foreground">
                Pedidos Aprovados Aguardando Entrega
              </h3>
              <div className="overflow-x-auto px-6 pb-2 pt-4" style={{ minHeight: 400 }}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="relative bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Protocolo
                        <FiltroColuna
                          ativo={filtroProtocoloFila !== ""}
                          onAplicar={(valor) => {
                            setFiltroProtocoloFila(valor);
                            setPaginaFila(1);
                          }}
                          onLimpar={() => {
                            setFiltroProtocoloFila("");
                            setPaginaFila(1);
                          }}
                        />
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Data Aprovação
                      </th>
                      <th className="relative bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Solicitante
                        <FiltroColuna
                          ativo={filtroSolicitanteFila !== ""}
                          onAplicar={(valor) => {
                            setFiltroSolicitanteFila(valor);
                            setPaginaFila(1);
                          }}
                          onLimpar={() => {
                            setFiltroSolicitanteFila("");
                            setPaginaFila(1);
                          }}
                        />
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Setor Destino
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Carregando...
                        </td>
                      </tr>
                    ) : fila.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Não há requisições na fila de separação no momento.
                        </td>
                      </tr>
                    ) : (
                      fila.map((requisicao) => (
                        <tr key={requisicao.id} className="border-b border-border/60 hover:bg-muted/40">
                          <td className="px-4 py-3 font-mono text-sm font-bold text-primary">
                            {requisicao.numero}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {formatarDataHora(requisicao.data_aprovacao)}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {requisicao.solicitante ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {requisicao.departamento_nome ?? ""}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Visualizar"
                                onClick={() => abrirVisualizacao(requisicao)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={processando}
                                onClick={() => negar(requisicao)}
                              >
                                <Ban className="h-4 w-4" />
                                Negar
                              </Button>
                              <Button
                                size="sm"
                                disabled={processando}
                                onClick={() => abrirAtendimento(requisicao)}
                              >
                                <PackageOpen className="h-4 w-4" />
                                Separar Itens
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
                <span className="text-xs text-muted-foreground">
                  Mostrando {fila.length} de {totalFila} registros
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={paginaFila <= 1 || carregando}
                    onClick={() => setPaginaFila((pagina) => Math.max(1, pagina - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-bold text-foreground">
                    {paginaFila} de {Math.max(1, paginasFila)}
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={paginaFila >= paginasFila || carregando}
                    onClick={() => setPaginaFila((pagina) => Math.min(paginasFila, pagina + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="px-6 pt-6 text-base font-semibold text-foreground">
                Meus Atendimentos Recentes
              </h3>
              <div className="overflow-x-auto px-6 pb-2 pt-4" style={{ minHeight: 400 }}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="relative bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Protocolo
                        <FiltroColuna
                          ativo={filtroProtocoloHistorico !== ""}
                          onAplicar={(valor) => {
                            setFiltroProtocoloHistorico(valor);
                            setPaginaHistorico(1);
                          }}
                          onLimpar={() => {
                            setFiltroProtocoloHistorico("");
                            setPaginaHistorico(1);
                          }}
                        />
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Data Atendimento
                      </th>
                      <th className="relative bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Setor Solicitante
                        <FiltroColuna
                          ativo={filtroSetorHistorico !== ""}
                          onAplicar={(valor) => {
                            setFiltroSetorHistorico(valor);
                            setPaginaHistorico(1);
                          }}
                          onLimpar={() => {
                            setFiltroSetorHistorico("");
                            setPaginaHistorico(1);
                          }}
                        />
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Status Final
                      </th>
                      <th className="bg-muted/30 px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Carregando...
                        </td>
                      </tr>
                    ) : historico.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Nenhum atendimento registrado.
                        </td>
                      </tr>
                    ) : (
                      historico.map((requisicao) => (
                        <tr key={requisicao.id} className="border-b border-border/60 hover:bg-muted/40">
                          <td className="px-4 py-3 font-mono text-sm font-bold text-foreground">
                            {requisicao.numero}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {formatarDataHora(requisicao.data_atendimento)}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {requisicao.departamento_nome ?? ""}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${classesStatus(
                                requisicao.status,
                              )}`}
                            >
                              {rotuloStatus(requisicao.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => abrirVisualizacao(requisicao)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
                <span className="text-xs text-muted-foreground">
                  Mostrando {historico.length} de {totalHistorico} registros
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={paginaHistorico <= 1 || carregando}
                    onClick={() => setPaginaHistorico((pagina) => Math.max(1, pagina - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-bold text-foreground">
                    {paginaHistorico} de {Math.max(1, paginasHistorico)}
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    disabled={paginaHistorico >= paginasHistorico || carregando}
                    onClick={() =>
                      setPaginaHistorico((pagina) => Math.min(paginasHistorico, pagina + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL ALMOXARIFADO (ATENDIMENTO E CORTES) */}
      <Dialog
        aberto={Boolean(requisicaoAtendimento)}
        aoFechar={() => setRequisicaoAtendimento(null)}
        titulo={
          <span>
            Separar Itens:{" "}
            <span className="text-primary">{requisicaoAtendimento?.numero ?? ""}</span>
          </span>
        }
        largura="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
            <span className="font-medium">i</span>
            <p>
              Ajuste a <strong>Qtd. Atendida</strong> caso não tenha estoque suficiente e informe a
              justificativa do corte.
            </p>
          </div>

          {carregandoItens ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : itensAtendimento.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum item adicionado.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-2/5 bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Produto
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                      Qtd. Pedida
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Qtd. Atendida (Real)
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Justificativa (se houver corte)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itensAtendimento.map((item) => (
                    <tr key={item.id} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{item.descricao ?? "-"}</span>
                        <span className="block text-xs text-muted-foreground">
                          Estoque: <span className="text-sky-600">{formatarNumero(item.estoque_atual)}</span>{" "}
                          {item.unidade ?? ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground">
                        {formatarNumero(item.quantidade)}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.estoque_atual}
                          value={quantidades[item.id] ?? ""}
                          onChange={(evento) =>
                            setQuantidades((atual) => ({ ...atual, [item.id]: evento.target.value }))
                          }
                          className="w-24"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={justificativas[item.id] ?? ""}
                          placeholder="Se cortar, justifique"
                          onChange={(evento) =>
                            setJustificativas((atual) => ({
                              ...atual,
                              [item.id]: evento.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRequisicaoAtendimento(null)}>
              Cancelar
            </Button>
            <Button disabled={processando || carregandoItens} onClick={confirmarAtendimento}>
              <CheckCheck className="h-4 w-4" />
              Confirmar Baixa no Estoque
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL VISUALIZAÇÃO DE REQUISIÇÃO */}
      <Dialog
        aberto={Boolean(requisicaoVisualizacao)}
        aoFechar={() => setRequisicaoVisualizacao(null)}
        titulo={
          <span>
            Detalhes da Requisição:{" "}
            <span className="text-primary">{requisicaoVisualizacao?.numero ?? ""}</span>
          </span>
        }
        largura="max-w-3xl"
      >
        <div className="space-y-4">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-border/60">
                <th className="w-1/4 px-3 py-2 text-left font-semibold text-muted-foreground">
                  Solicitante:
                </th>
                <td className="px-3 py-2 text-foreground">
                  {requisicaoVisualizacao?.solicitante ?? "-"}
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Setor Destino:
                </th>
                <td className="px-3 py-2 text-foreground">
                  {requisicaoVisualizacao?.departamento_nome || "Não definido"}
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Data Solic.:
                </th>
                <td className="px-3 py-2 text-foreground">
                  {requisicaoVisualizacao
                    ? new Date(requisicaoVisualizacao.data_solicitacao).toLocaleDateString("pt-BR")
                    : "-"}
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Status Final:
                </th>
                <td className="px-3 py-2">
                  {requisicaoVisualizacao && (
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${classesStatus(
                        requisicaoVisualizacao.status,
                      )}`}
                    >
                      {rotuloStatus(requisicaoVisualizacao.status)}
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Observações:
                </th>
                <td className="px-3 py-2 text-foreground">
                  {requisicaoVisualizacao?.observacoes || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              Itens e Cortes Realizados
            </h4>
            {carregandoVisualizacao ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="bg-muted/30 px-3 py-2 text-left font-semibold text-muted-foreground">
                        Produto
                      </th>
                      <th className="bg-muted/30 px-3 py-2 text-center font-semibold text-muted-foreground">
                        Qtd. Pedida
                      </th>
                      <th className="bg-muted/30 px-3 py-2 text-center font-semibold text-muted-foreground">
                        Qtd. Entregue
                      </th>
                      <th className="bg-muted/30 px-3 py-2 text-left font-semibold text-muted-foreground">
                        Justificativa (Corte)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensVisualizacao.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          Nenhum item adicionado.
                        </td>
                      </tr>
                    ) : (
                      itensVisualizacao.map((item) => (
                        <tr key={item.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-semibold text-foreground">
                            {item.descricao ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-foreground">
                            {formatarNumero(item.quantidade)}
                          </td>
                          <td className="px-3 py-2 text-center text-foreground">
                            {item.quantidade_atendida === null || item.quantidade_atendida === undefined
                              ? "-"
                              : formatarNumero(item.quantidade_atendida)}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {item.justificativa_corte || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setRequisicaoVisualizacao(null)}>
              Fechar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
