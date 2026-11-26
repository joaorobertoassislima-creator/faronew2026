import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Package,
  Plus,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalPesquisaContratoEntrada } from "@/components/estoque/ModalPesquisaContratoEntrada";
import { ModalPesquisaProdutoEntrada } from "@/components/estoque/ModalPesquisaProdutoEntrada";
import {
  estornarEntrada,
  listarEntradas,
  registrarEntrada,
  type EntradaRegistro,
  type ProdutoEntrada,
} from "@/lib/entradas";

function formatarDataHora(iso: string): string {
  if (!iso) return "-";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-BR");
}

function formatarNumero(valor: number | null, casas = 2): string {
  if (valor === null || Number.isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarMoeda(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface FormEntrada {
  produto: ProdutoEntrada | null;
  quantidade: string;
  valorUnitario: string;
  notaFiscal: string;
  contratoId: string | null;
  contratoNumero: string | null;
  contratoFornecedor: string | null;
  numeroLote: string;
  dataValidade: string;
}

const FORM_VAZIO: FormEntrada = {
  produto: null,
  quantidade: "",
  valorUnitario: "",
  notaFiscal: "",
  contratoId: null,
  contratoNumero: null,
  contratoFornecedor: null,
  numeroLote: "",
  dataValidade: "",
};

export default function Entradas() {
  const [aba, setAba] = useState<"historico">("historico");
  const [entradas, setEntradas] = useState<EntradaRegistro[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState("");

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [modalContrato, setModalContrato] = useState(false);
  const [modalVisualizacao, setModalVisualizacao] = useState<EntradaRegistro | null>(null);
  const [form, setForm] = useState<FormEntrada>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resultado = await listarEntradas(pagina, filtroProduto, filtroNotaFiscal);
      setEntradas(resultado.registros);
      setTotal(resultado.total);
      setTotalPaginas(resultado.totalPaginas);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar entradas.");
    } finally {
      setCarregando(false);
    }
  }, [pagina, filtroProduto, filtroNotaFiscal]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!erro && !mensagem) return;
    const timer = window.setTimeout(() => {
      setErro(null);
      setMensagem(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [erro, mensagem]);

  const controlaLote = useMemo(() => Boolean(form.produto?.controla_lote), [form.produto]);

  function abrirFormulario() {
    setForm(FORM_VAZIO);
    setErro(null);
    setModalEntrada(true);
  }

  async function salvarEntrada() {
    if (!form.produto) {
      setErro("Selecione um produto para registrar a entrada.");
      return;
    }
    const quantidade = Number(form.quantidade.replace(",", "."));
    const valorUnitario = Number(form.valorUnitario.replace(",", "."));
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      setErro("Informe um valor unitário válido.");
      return;
    }
    if (controlaLote) {
      if (form.numeroLote.trim() === "" || form.dataValidade === "") {
        setErro("Informe o número do lote e a data de validade.");
        return;
      }
    }

    setSalvando(true);
    try {
      await registrarEntrada({
        produto_id: form.produto.id,
        quantidade,
        valor_unitario: valorUnitario,
        nota_fiscal: form.notaFiscal,
        contrato_id: form.contratoId,
        numero_lote: controlaLote ? form.numeroLote : null,
        data_validade: controlaLote ? form.dataValidade : null,
      });
      setModalEntrada(false);
      setMensagem("Entrada de material registrada com sucesso!");
      setPagina(1);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar entrada.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarEstorno(entrada: EntradaRegistro) {
    const ok = window.confirm(
      "Atenção: o estorno vai abater o estoque e excluir este registro. Confirma?",
    );
    if (!ok) {
      setMensagem("A movimentação foi mantida.");
      return;
    }
    try {
      await estornarEntrada(entrada.id);
      setMensagem("Estorno de entrada realizado com sucesso!");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao estornar entrada.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimentação - Entradas</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de recebimentos de materiais e registro de novas entradas
          </p>
        </div>
        <Button onClick={abrirFormulario}>
          <Plus className="h-4 w-4" />
          Registrar Nova Entrada
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setAba("historico")}
          className={
            aba === "historico"
              ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
              : "px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          }
        >
          Histórico de Recebimentos
        </button>
      </div>

      {(erro || mensagem) && (
        <div
          className={
            erro
              ? "rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {erro ?? mensagem}
        </div>
      )}

      {aba === "historico" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" />
              Histórico de Recebimentos
            </CardTitle>
            <span className="text-xs text-muted-foreground">{total} registro(s)</span>
          </CardHeader>

          <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroProduto}
                onChange={(e) => {
                  setFiltroProduto(e.target.value);
                  setPagina(1);
                }}
                placeholder="Filtrar por produto..."
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroNotaFiscal}
                onChange={(e) => {
                  setFiltroNotaFiscal(e.target.value);
                  setPagina(1);
                }}
                placeholder="Filtrar por nota fiscal..."
                className="pl-9"
              />
            </div>
          </div>

          <CardContent className="p-0">
            {carregando ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Carregando entradas...
              </p>
            ) : entradas.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-border" />
                <h4 className="mb-1 font-medium">Nenhuma entrada registrada</h4>
                <p className="text-sm text-muted-foreground">
                  Inicie o registro de recebimento de materiais no estoque.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Quant.</th>
                        <th className="px-4 py-3">V. Unit (R$)</th>
                        <th className="px-4 py-3">Contrato / Fornecedor</th>
                        <th className="px-4 py-3">Nota Fiscal</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entradas.map((entrada) => (
                        <tr
                          key={entrada.id}
                          className="border-t border-border transition hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatarDataHora(entrada.data_registro)}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {entrada.produto_nome}
                            {entrada.unidade_sigla ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({entrada.unidade_sigla})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              + {formatarNumero(entrada.quantidade)} {entrada.unidade_sigla ?? ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatarMoeda(entrada.valor_unitario)}
                          </td>
                          <td className="px-4 py-3">
                            {entrada.contrato_numero ? (
                              <div>
                                <div className="font-semibold text-sky-700">
                                  {entrada.contrato_numero}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {entrada.contrato_fornecedor}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Entrada Avulsa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">{entrada.nota_fiscal ?? "-"}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button
                              size="icon"
                              variant="outline"
                              title="Visualizar entrada"
                              onClick={() => setModalVisualizacao(entrada)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 text-destructive hover:text-destructive"
                              onClick={() => void confirmarEstorno(entrada)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Estornar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {entradas.length} de {total} registros
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
                      {pagina} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={pagina >= totalPaginas}
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

      {modalEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-base font-semibold">Registrar Entrada de Material</h3>
              <button
                type="button"
                onClick={() => setModalEntrada(false)}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
              >
                Cancelar
              </button>
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>
                  Produto <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={form.produto ? form.produto.nome : ""}
                    placeholder="Pesquisar produto no catálogo..."
                    onClick={() => setModalProduto(true)}
                  />
                  <Button variant="outline" onClick={() => setModalProduto(true)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>
                  Quantidade <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  placeholder="Ex: 100"
                />
              </div>

              <div>
                <Label>
                  Valor Unitário (R$) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorUnitario}
                  onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                  placeholder="Ex: 15,50"
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Vincular Contrato</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={form.contratoNumero ?? ""}
                    placeholder="Pesquisar contrato para bater saldo..."
                    onClick={() => setModalContrato(true)}
                  />
                  <Button variant="outline" onClick={() => setModalContrato(true)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {form.contratoFornecedor ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.contratoFornecedor}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <Label>Nota Fiscal</Label>
                <Input
                  value={form.notaFiscal}
                  onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })}
                  placeholder="Nº da NF-e"
                />
              </div>

              {controlaLote && (
                <div className="sm:col-span-2 grid gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 sm:grid-cols-2">
                  <div>
                    <Label>
                      Nº do Lote <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.numeroLote}
                      onChange={(e) => setForm({ ...form, numeroLote: e.target.value })}
                      placeholder="Lote 123"
                    />
                  </div>
                  <div>
                    <Label>
                      Data de Validade <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={form.dataValidade}
                      onChange={(e) => setForm({ ...form, dataValidade: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
              <Button variant="outline" onClick={() => setModalEntrada(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void salvarEntrada()} disabled={salvando}>
                <Package className="h-4 w-4" />
                {salvando ? "Registrando..." : "Efetivar Entrada"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalVisualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-base font-semibold">Detalhes da Entrada</h3>
              <button
                type="button"
                onClick={() => setModalVisualizacao(null)}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
              >
                Fechar
              </button>
            </div>

            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <th className="w-[30%] bg-muted/30 px-5 py-2 text-left font-medium">
                    Data do Registro:
                  </th>
                  <td className="px-5 py-2">{formatarDataHora(modalVisualizacao.data_registro)}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Produto:</th>
                  <td className="px-5 py-2">
                    {modalVisualizacao.produto_nome}
                    {modalVisualizacao.unidade_sigla
                      ? ` (${modalVisualizacao.unidade_sigla})`
                      : ""}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Quantidade:</th>
                  <td className="px-5 py-2">{formatarNumero(modalVisualizacao.quantidade)}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Valor Unitário:</th>
                  <td className="px-5 py-2">{formatarMoeda(modalVisualizacao.valor_unitario)}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Nota Fiscal:</th>
                  <td className="px-5 py-2">{modalVisualizacao.nota_fiscal ?? "-"}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Contrato:</th>
                  <td className="px-5 py-2">{modalVisualizacao.contrato_numero ?? "Entrada Avulsa"}</td>
                </tr>
                <tr className="border-b border-border">
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Fornecedor:</th>
                  <td className="px-5 py-2">{modalVisualizacao.contrato_fornecedor ?? "-"}</td>
                </tr>
                <tr>
                  <th className="bg-muted/30 px-5 py-2 text-left font-medium">Lote Criado:</th>
                  <td className="px-5 py-2">
                    {modalVisualizacao.numero_lote
                      ? `${modalVisualizacao.numero_lote} (Val: ${formatarData(
                          modalVisualizacao.data_validade,
                        )})`
                      : "Não"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end border-t border-border bg-muted/20 px-5 py-3">
              <Button variant="outline" onClick={() => setModalVisualizacao(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalPesquisaProdutoEntrada
        aberto={modalProduto}
        aoFechar={() => setModalProduto(false)}
        aoSelecionar={(produto) => {
          setForm((atual) => ({
            ...atual,
            produto,
            numeroLote: atual.numeroLote,
            dataValidade: atual.dataValidade,
          }));
          setModalProduto(false);
          setMensagem("Item selecionado e vinculado.");
        }}
      />

      <ModalPesquisaContratoEntrada
        aberto={modalContrato}
        aoFechar={() => setModalContrato(false)}
        aoSelecionar={(contrato) => {
          setForm((atual) => ({
            ...atual,
            contratoId: contrato.id,
            contratoNumero: contrato.numero,
            contratoFornecedor: contrato.fornecedor,
          }));
          setModalContrato(false);
          setMensagem("Contrato vinculado.");
        }}
      />
    </div>
  );
}
