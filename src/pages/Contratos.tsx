import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { dataParaIso, formatarDataISO, formatarMoeda, isoParaDataBr } from "@/lib/format";
import { traduzirErroSupabase } from "@/lib/erros";
import {
  MODALIDADES,
  STATUS_CONTRATO,
  diasParaVencer,
  moedaParaNumero,
  rotuloStatus,
  varianteStatus,
  type Contrato,
} from "@/lib/contratos";

interface Formulario {
  numero: string;
  objeto: string;
  fornecedor: string;
  cnpj: string;
  modalidade: string;
  processo: string;
  valor: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  observacoes: string;
}

const FORMULARIO_VAZIO: Formulario = {
  numero: "",
  objeto: "",
  fornecedor: "",
  cnpj: "",
  modalidade: MODALIDADES[0],
  processo: "",
  valor: "",
  data_inicio: "",
  data_fim: "",
  status: "vigente",
  observacoes: "",
};

export default function Contratos() {
  const { papeis } = useAuth();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const idParaEditar = parametros.get("editar");
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroVigencia, setFiltroVigencia] = useState("todos");

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<Contrato | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<Contrato | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("numero", { ascending: true });
    if (error) {
      setErro(traduzirErroSupabase(error.message));
      setContratos([]);
    } else {
      setContratos((data as Contrato[]) ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Abre a edição quando a página é acessada por /contratos?editar=<id>
  const [parametroAplicado, setParametroAplicado] = useState(false);
  useEffect(() => {
    if (!idParaEditar || parametroAplicado) return;
    const alvo = contratos.find((item) => item.id === idParaEditar);
    if (!alvo) {
      if (!carregando) {
        setParametroAplicado(true);
        setParametros({}, { replace: true });
      }
      return;
    }
    setParametroAplicado(true);
    setParametros({}, { replace: true });
    abrirEdicao(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParaEditar, parametroAplicado, contratos, carregando, setParametros]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contratos.filter((contrato) => {
      if (filtroStatus !== "todos" && contrato.status !== filtroStatus) return false;
      if (filtroVigencia !== "todos") {
        const dias = diasParaVencer(contrato.data_fim);
        if (filtroVigencia === "vigente" && (!dias || dias < 0)) return false;
        if (filtroVigencia === "vencendo" && (!dias || dias < 0 || dias > 60)) return false;
        if (filtroVigencia === "encerrado" && dias !== null && dias >= 0) return false;
      }
      if (!termo) return true;
      return [contrato.numero, contrato.objeto, contrato.fornecedor, contrato.processo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [contratos, busca, filtroStatus, filtroVigencia]);

  const totais = useMemo(() => {
    const vigentes = contratos.filter((c) => c.status === "vigente");
    return {
      quantidade: contratos.length,
      valorTotal: contratos.reduce((soma, c) => soma + Number(c.valor ?? 0), 0),
      vigentes: vigentes.length,
      vencendo: vigentes.filter((c) => {
        const dias = diasParaVencer(c.data_fim);
        return dias !== null && dias >= 0 && dias <= 60;
      }).length,
    };
  }, [contratos]);

  function abrirNovo() {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(contrato: Contrato) {
    setEditando(contrato);
    setFormulario({
      numero: contrato.numero,
      objeto: contrato.objeto,
      fornecedor: contrato.fornecedor,
      cnpj: contrato.cnpj ?? "",
      modalidade: contrato.modalidade,
      processo: contrato.processo ?? "",
      valor: contrato.valor ? String(contrato.valor).replace(".", ",") : "",
      data_inicio: isoParaDataBr(contrato.data_inicio),
      data_fim: isoParaDataBr(contrato.data_fim),
      status: contrato.status,
      observacoes: contrato.observacoes ?? "",
    });
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function alterar(campo: keyof Formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    if (!formulario.numero.trim()) {
      setErroFormulario("Informe o número do contrato.");
      return;
    }
    if (!formulario.objeto.trim()) {
      setErroFormulario("Informe o objeto do contrato.");
      return;
    }
    if (!formulario.fornecedor.trim()) {
      setErroFormulario("Informe o fornecedor contratado.");
      return;
    }
    const inicioIso = formulario.data_inicio ? dataParaIso(formulario.data_inicio) : null;
    const fimIso = formulario.data_fim ? dataParaIso(formulario.data_fim) : null;
    if (formulario.data_inicio && !inicioIso) {
      setErroFormulario("Informe a data de início no formato dd/mm/aaaa.");
      return;
    }
    if (formulario.data_fim && !fimIso) {
      setErroFormulario("Informe a data de término no formato dd/mm/aaaa.");
      return;
    }
    if (inicioIso && fimIso && fimIso < inicioIso) {
      setErroFormulario("A data de término deve ser posterior à data de início.");
      return;
    }

    setSalvando(true);
    setErroFormulario(null);

    const dados = {
      numero: formulario.numero.trim(),
      objeto: formulario.objeto.trim(),
      fornecedor: formulario.fornecedor.trim(),
      cnpj: formulario.cnpj.trim() || null,
      modalidade: formulario.modalidade,
      processo: formulario.processo.trim() || null,
      valor: moedaParaNumero(formulario.valor),
      data_inicio: inicioIso,
      data_fim: fimIso,
      status: formulario.status,
      observacoes: formulario.observacoes.trim() || null,
    };

    const resultado = editando
      ? await supabase.from("contratos").update(dados).eq("id", editando.id)
      : await supabase.from("contratos").insert(dados);

    setSalvando(false);

    if (resultado.error) {
      setErroFormulario(traduzirErroSupabase(resultado.error.message));
      return;
    }

    setDialogoAberto(false);
    setMensagem(editando ? "Contrato atualizado com sucesso." : "Contrato registrado com sucesso.");
    await carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    const { error } = await supabase.from("contratos").delete().eq("id", excluindo.id);
    setProcessandoExclusao(false);
    if (error) {
      setErro(traduzirErroSupabase(error.message));
      setExcluindo(null);
      return;
    }
    setExcluindo(null);
    setMensagem("Contrato excluído.");
    await carregar();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Secretaria de Planejamento e Finanças – Prefeitura de Ourinhos/SP
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <FileSignature className="h-6 w-6 text-primary" />
            Contratos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle de contratos firmados pela Prefeitura: vigências, valores e fornecedores.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={abrirNovo} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Novo contrato
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contratos</p>
            <p className="mt-1 text-xl font-semibold">{totais.quantidade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vigentes</p>
            <p className="mt-1 text-xl font-semibold">{totais.vigentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Vencem em 60 dias
            </p>
            <p className="mt-1 text-xl font-semibold">{totais.vencendo}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</p>
            <p className="mt-1 text-xl font-semibold">{formatarMoeda(totais.valorTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p>{erro}</p>
            <Button variant="link" className="h-auto p-0" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {mensagem && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {mensagem}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca"
                  className="pl-9"
                  placeholder="Número, objeto, fornecedor…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-status">Status</Label>
              <Select
                id="filtro-status"
                className="mt-1"
                value={filtroStatus}
                onChange={(evento) => setFiltroStatus(evento.target.value)}
              >
                <option value="todos">Todos</option>
                {STATUS_CONTRATO.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-vigencia">Vigência</Label>
              <Select
                id="filtro-vigencia"
                className="mt-1"
                value={filtroVigencia}
                onChange={(evento) => setFiltroVigencia(evento.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="vigente">Em vigência</option>
                <option value="vencendo">Vencendo em até 60 dias</option>
                <option value="encerrado">Vigência encerrada</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contratos…
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {contratos.length === 0
              ? "Nenhum contrato registrado até o momento."
              : "Nenhum contrato encontrado com os filtros selecionados."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabela (desktop) */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Objeto</th>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Vigência</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((contrato) => {
                  const dias = diasParaVencer(contrato.data_fim);
                  return (
                    <tr key={contrato.id} className="border-t border-border align-top">
                      <td className="px-4 py-3 font-medium">{contrato.numero}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs">{contrato.objeto}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {contrato.modalidade}
                          {contrato.processo ? ` · Proc. ${contrato.processo}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{contrato.fornecedor}</p>
                        {contrato.cnpj && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            CNPJ {contrato.cnpj}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p>
                          {formatarDataISO(contrato.data_inicio)} a {formatarDataISO(contrato.data_fim)}
                        </p>
                        {dias !== null && dias >= 0 && dias <= 60 && (
                          <p className="mt-0.5 text-xs font-medium text-amber-700">
                            Vence em {dias} dia(s)
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatarMoeda(Number(contrato.valor ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={varianteStatus(contrato.status)}>
                          {rotuloStatus(contrato.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Visualizar contrato ${contrato.numero}`}
                            title="Visualizar contrato"
                            onClick={() => navegar(`/contratos/${contrato.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {podeEditar && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar contrato ${contrato.numero}`}
                                title="Editar contrato"
                                onClick={() => abrirEdicao(contrato)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir contrato ${contrato.numero}`}
                                title="Excluir contrato"
                                className="text-destructive"
                                onClick={() => setExcluindo(contrato)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Cartões (mobile) */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((contrato) => {
              const dias = diasParaVencer(contrato.data_fim);
              return (
                <Card key={contrato.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{contrato.numero}</p>
                        <p className="text-sm text-muted-foreground">{contrato.objeto}</p>
                      </div>
                      <Badge variant={varianteStatus(contrato.status)}>
                        {rotuloStatus(contrato.status)}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Fornecedor</dt>
                      <dd className="text-right">{contrato.fornecedor}</dd>
                      <dt className="text-muted-foreground">Modalidade</dt>
                      <dd className="text-right">{contrato.modalidade}</dd>
                      <dt className="text-muted-foreground">Vigência</dt>
                      <dd className="text-right">
                        {formatarDataISO(contrato.data_inicio)} a {formatarDataISO(contrato.data_fim)}
                      </dd>
                      <dt className="text-muted-foreground">Valor</dt>
                      <dd className="text-right font-medium">
                        {formatarMoeda(Number(contrato.valor ?? 0))}
                      </dd>
                    </dl>
                    {dias !== null && dias >= 0 && dias <= 60 && (
                      <p className="text-xs font-medium text-amber-700">
                        Vence em {dias} dia(s)
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navegar(`/contratos/${contrato.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      {podeEditar && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => abrirEdicao(contrato)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            aria-label={`Excluir contrato ${contrato.numero}`}
                            onClick={() => setExcluindo(contrato)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        aberto={dialogoAberto}
        titulo={editando ? `Editar contrato ${editando.numero}` : "Novo contrato"}
        descricao="Preencha os dados do contrato. Datas no formato dd/mm/aaaa e valores em R$."
        aoFechar={() => setDialogoAberto(false)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setDialogoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar contrato
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {erroFormulario && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{erroFormulario}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="numero">Número do contrato *</Label>
              <Input
                id="numero"
                className="mt-1"
                value={formulario.numero}
                onChange={(evento) => alterar("numero", evento.target.value)}
                placeholder="Ex.: 2026/001"
              />
            </div>
            <div>
              <Label htmlFor="processo">Processo licitatório</Label>
              <Input
                id="processo"
                className="mt-1"
                value={formulario.processo}
                onChange={(evento) => alterar("processo", evento.target.value)}
                placeholder="Ex.: 0126/2026"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="objeto">Objeto *</Label>
            <Textarea
              id="objeto"
              className="mt-1"
              value={formulario.objeto}
              onChange={(evento) => alterar("objeto", evento.target.value)}
              placeholder="Descrição do objeto contratado"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Input
                id="fornecedor"
                className="mt-1"
                value={formulario.fornecedor}
                onChange={(evento) => alterar("fornecedor", evento.target.value)}
                placeholder="Razão social do fornecedor"
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                className="mt-1"
                value={formulario.cnpj}
                onChange={(evento) => alterar("cnpj", evento.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="modalidade">Modalidade</Label>
              <Select
                id="modalidade"
                className="mt-1"
                value={formulario.modalidade}
                onChange={(evento) => alterar("modalidade", evento.target.value)}
              >
                {MODALIDADES.map((modalidade) => (
                  <option key={modalidade} value={modalidade}>
                    {modalidade}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                className="mt-1"
                value={formulario.status}
                onChange={(evento) => alterar("status", evento.target.value)}
              >
                {STATUS_CONTRATO.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                className="mt-1"
                inputMode="decimal"
                value={formulario.valor}
                onChange={(evento) => alterar("valor", evento.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="data-inicio">Início da vigência</Label>
              <Input
                id="data-inicio"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formulario.data_inicio}
                onChange={(evento) => alterar("data_inicio", evento.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data-fim">Término da vigência</Label>
              <Input
                id="data-fim"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formulario.data_fim}
                onChange={(evento) => alterar("data_fim", evento.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              className="mt-1"
              value={formulario.observacoes}
              onChange={(evento) => alterar("observacoes", evento.target.value)}
              placeholder="Informações adicionais do contrato"
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        aberto={Boolean(excluindo)}
        titulo="Excluir contrato"
        descricao={
          excluindo
            ? `O contrato ${excluindo.numero} será removido permanentemente. Esta ação não pode ser desfeita.`
            : undefined
        }
        aoFechar={() => setExcluindo(null)}
        largura="max-w-md"
        rodape={
          <>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmarExclusao()}
              disabled={processandoExclusao}
            >
              {processandoExclusao && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Prefira manter o registro e alterar o status para &quot;rescindido&quot; quando o contrato
          for encerrado, preservando o histórico para a auditoria.
        </p>
      </Dialog>
    </div>
  );
}
