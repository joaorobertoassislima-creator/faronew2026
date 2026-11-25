import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileSignature,
  Hash,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { traduzirErroSupabase } from "@/lib/erros";
import {
  dataParaIso,
  formatarDataHora,
  formatarDataISO,
  formatarMoeda,
  isoParaDataBr,
} from "@/lib/format";
import {
  diasParaVencer,
  moedaParaNumero,
  rotuloStatus,
  statusEfetivo,
  varianteStatus,
  type Aditivo,
  type Contrato,
} from "@/lib/contratos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

function Linha({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string;
  valor: string;
  icone?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icone}
        {rotulo}
      </dt>
      <dd className="text-sm font-medium sm:text-right">{valor}</dd>
    </div>
  );
}

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { papeis } = useAuth();
  const { toast } = useToast();
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [paginaAditivos, setPaginaAditivos] = useState(0);

  const [dialogoAditivo, setDialogoAditivo] = useState(false);
  const [aditivoEditando, setAditivoEditando] = useState<Aditivo | null>(null);
  const [aditivoExcluindo, setAditivoExcluindo] = useState<Aditivo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [formularioEdicao, setFormularioEdicao] = useState({
    numero: "",
    data_aditivo: "",
    data_inicio: "",
    data_fim: "",
    tipo_valor: "inalterado" as "inalterado" | "acrescimo" | "reducao",
    valor_aditivo: "",
    observacoes: "",
  });
  const ADITIVOS_POR_PAGINA = 3;
  const totalPaginasAditivos = Math.max(
    1,
    Math.ceil(aditivos.length / ADITIVOS_POR_PAGINA),
  );
  const paginaAditivosAtual = Math.min(paginaAditivos, totalPaginasAditivos - 1);
  const aditivosDaPagina = aditivos.slice(
    paginaAditivosAtual * ADITIVOS_POR_PAGINA,
    paginaAditivosAtual * ADITIVOS_POR_PAGINA + ADITIVOS_POR_PAGINA,
  );

  const [formulario, setFormulario] = useState({
    numero: "",
    data_aditivo: "",
    data_inicio: "",
    data_fim: "",
    tipo_valor: "inalterado" as "inalterado" | "acrescimo" | "reducao",
    valor_aditivo: "",
    observacoes: "",
  });

  const carregar = useCallback(async () => {
    if (!id) {
      setErro("Contrato não informado.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      setErro(traduzirErroSupabase(error.message));
      setContrato(null);
    } else if (!data) {
      setErro("Contrato não encontrado ou você não tem permissão para acessá-lo.");
      setContrato(null);
    } else {
      setContrato(data as Contrato);
    }
    setCarregando(false);
  }, [id]);

  const carregarAditivos = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("aditivos_contrato")
      .select("*")
      .eq("contrato_id", id)
      .order("data_aditivo", { ascending: false })
      .order("criado_em", { ascending: false });
    if (error) {
      setErro(traduzirErroSupabase(error.message));
      return;
    }
    setAditivos((data as Aditivo[]) ?? []);
    setPaginaAditivos(0);
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    void carregarAditivos();
  }, [carregarAditivos]);

  function abrirAditivo() {
    setFormulario({
      numero: "",
      data_aditivo: "",
      data_inicio: contrato?.data_inicio ? isoParaDataBr(contrato.data_inicio) : "",
      data_fim: contrato?.data_fim ? isoParaDataBr(contrato.data_fim) : "",
      tipo_valor: "inalterado",
      valor_aditivo: "",
      observacoes: "",
    });
    setErroFormulario(null);
    setDialogoAditivo(true);
  }

  function alterar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarAditivo() {
    if (!contrato) return;
    if (!formulario.numero.trim()) {
      setErroFormulario("Informe o número do aditivo.");
      return;
    }
    if (!formulario.data_aditivo.trim()) {
      setErroFormulario("Informe a data do aditivo.");
      return;
    }
    if (!formulario.data_fim.trim()) {
      setErroFormulario("Informe a nova data de vigência (término).");
      return;
    }
    const dataAditivoIso = dataParaIso(formulario.data_aditivo);
    const inicioIso = formulario.data_inicio ? dataParaIso(formulario.data_inicio) : null;
    const fimIso = dataParaIso(formulario.data_fim);
    if (!dataAditivoIso || !fimIso) {
      setErroFormulario("Informe as datas no formato dd/mm/aaaa.");
      return;
    }
    if (inicioIso && fimIso && fimIso < inicioIso) {
      setErroFormulario("A data de término deve ser posterior à data de início.");
      return;
    }
    const valorAnterior = Number(contrato.valor ?? 0);
    let valorNovo = valorAnterior;
    let tipoValor: "inalterado" | "acrescimo" | "reducao" = "inalterado";
    if (formulario.tipo_valor !== "inalterado") {
      const valorAlteracao = moedaParaNumero(formulario.valor_aditivo);
      if (valorAlteracao <= 0) {
        setErroFormulario("Informe o valor do aditivo (maior que zero).");
        return;
      }
      tipoValor = formulario.tipo_valor;
      valorNovo =
        tipoValor === "acrescimo" ? valorAnterior + valorAlteracao : valorAnterior - valorAlteracao;
      if (valorNovo < 0) {
        setErroFormulario("A redução não pode deixar o valor do contrato negativo.");
        return;
      }
    }

    setSalvando(true);
    setErroFormulario(null);

    const { error: erroAditivo } = await supabase.from("aditivos_contrato").insert({
      contrato_id: contrato.id,
      numero: formulario.numero.trim(),
      data_aditivo: dataAditivoIso,
      data_inicio: inicioIso,
      data_fim: fimIso,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      tipo_valor: tipoValor,
      observacoes: formulario.observacoes.trim() || null,
    });

    if (erroAditivo) {
      setSalvando(false);
      const msgToast = traduzirErroSupabase(erroAditivo.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
      return;
    }

    const { error: erroContrato } = await supabase
      .from("contratos")
      .update({
        data_inicio: inicioIso ?? contrato.data_inicio,
        data_fim: fimIso,
        valor: valorNovo,
        status: "vigente",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", contrato.id);

    setSalvando(false);

    if (erroContrato) {
      const msgToast = traduzirErroSupabase(erroContrato.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
      return;
    }

    setDialogoAditivo(false);
    toast(
      tipoValor === "inalterado"
        ? "Aditivo registrado e vigência do contrato atualizada."
        : "Aditivo registrado, vigência e valor do contrato atualizados.",
    );
    await carregar();
    await carregarAditivos();
  }

  function abrirEdicaoAditivo(aditivo: Aditivo) {
    const tipo = aditivo.tipo_valor ?? "inalterado";
    const anterior = Number(aditivo.valor_anterior ?? 0);
    const novo = Number(aditivo.valor_novo ?? anterior);
    const diferenca =
      tipo === "acrescimo" ? Math.abs(novo - anterior) : tipo === "reducao" ? Math.abs(anterior - novo) : 0;
    setFormularioEdicao({
      numero: aditivo.numero,
      data_aditivo: isoParaDataBr(aditivo.data_aditivo),
      data_inicio: isoParaDataBr(aditivo.data_inicio),
      data_fim: isoParaDataBr(aditivo.data_fim),
      tipo_valor: tipo,
      valor_aditivo: diferenca > 0 ? diferenca.toFixed(2).replace(".", ",") : "",
      observacoes: aditivo.observacoes ?? "",
    });
    setErroFormulario(null);
    setAditivoEditando(aditivo);
  }

  async function salvarEdicaoAditivo() {
    if (!aditivoEditando) return;
    if (!formularioEdicao.numero.trim()) {
      setErroFormulario("Informe o número do aditivo.");
      return;
    }
    if (!formularioEdicao.data_aditivo.trim()) {
      setErroFormulario("Informe a data do aditivo.");
      return;
    }
    if (!formularioEdicao.data_fim.trim()) {
      setErroFormulario("Informe a nova data de vigência (término).");
      return;
    }
    const dataAditivoIso = dataParaIso(formularioEdicao.data_aditivo);
    const inicioIso = formularioEdicao.data_inicio ? dataParaIso(formularioEdicao.data_inicio) : null;
    const fimIso = dataParaIso(formularioEdicao.data_fim);
    if (!dataAditivoIso || !fimIso) {
      setErroFormulario("Informe as datas no formato dd/mm/aaaa.");
      return;
    }
    if (inicioIso && fimIso && fimIso < inicioIso) {
      setErroFormulario("A data de término deve ser posterior à data de início.");
      return;
    }
    const valorAnterior = Number(aditivoEditando.valor_anterior ?? 0);
    let valorNovo = valorAnterior;
    let tipoValor: "inalterado" | "acrescimo" | "reducao" = "inalterado";
    if (formularioEdicao.tipo_valor !== "inalterado") {
      const valorAlteracao = moedaParaNumero(formularioEdicao.valor_aditivo);
      if (valorAlteracao <= 0) {
        setErroFormulario("Informe o valor do aditivo (maior que zero).");
        return;
      }
      tipoValor = formularioEdicao.tipo_valor;
      valorNovo =
        tipoValor === "acrescimo" ? valorAnterior + valorAlteracao : valorAnterior - valorAlteracao;
      if (valorNovo < 0) {
        setErroFormulario("A redução não pode deixar o valor do contrato negativo.");
        return;
      }
    }

    setSalvando(true);
    setErroFormulario(null);

    const { error: erroAditivo } = await supabase
      .from("aditivos_contrato")
      .update({
        numero: formularioEdicao.numero.trim(),
        data_aditivo: dataAditivoIso,
        data_inicio: inicioIso,
        data_fim: fimIso,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        tipo_valor: tipoValor,
        observacoes: formularioEdicao.observacoes.trim() || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", aditivoEditando.id);

    if (erroAditivo) {
      setSalvando(false);
      const msgToast = traduzirErroSupabase(erroAditivo.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
      return;
    }

    // Se o aditivo editado é o que define a vigência atual do contrato,
    // a vigência e o valor do contrato também são atualizados.
    if (contrato && contrato.data_fim === aditivoEditando.data_fim) {
      const { error: erroContrato } = await supabase
        .from("contratos")
        .update({
          data_inicio: inicioIso ?? contrato.data_inicio,
          data_fim: fimIso,
          valor: valorNovo,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", contrato.id);
      if (erroContrato) {
        setSalvando(false);
        const msgToast = traduzirErroSupabase(erroContrato.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
        return;
      }
    }

    setSalvando(false);
    setAditivoEditando(null);
    toast("Aditivo atualizado.");
    await carregar();
    await carregarAditivos();
  }

  async function excluirAditivo() {
    if (!aditivoExcluindo) return;
    setSalvando(true);
    setErroFormulario(null);

    const { error } = await supabase
      .from("aditivos_contrato")
      .delete()
      .eq("id", aditivoExcluindo.id);

    if (error) {
      setSalvando(false);
      const msgToast = traduzirErroSupabase(error.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
      return;
    }

    // Ao remover o aditivo que vigora, o contrato volta ao aditivo mais
    // recente restante (ou à vigência/valor originais).
    if (contrato && contrato.data_fim === aditivoExcluindo.data_fim) {
      const restantes = aditivos
        .filter((item) => item.id !== aditivoExcluindo.id)
        .sort((a, b) => (a.data_aditivo < b.data_aditivo ? 1 : -1));
      const anterior = restantes[0];
      const { error: erroContrato } = await supabase
        .from("contratos")
        .update({
          data_inicio:
            anterior?.data_inicio ?? contrato.vigencia_original_inicio ?? contrato.data_inicio,
          data_fim: anterior?.data_fim ?? contrato.vigencia_original_fim ?? contrato.data_fim,
          valor:
            anterior?.valor_novo !== null && anterior?.valor_novo !== undefined
              ? Number(anterior.valor_novo)
              : contrato.valor_original !== null && contrato.valor_original !== undefined
                ? Number(contrato.valor_original)
                : contrato.valor,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", contrato.id);
      if (erroContrato) {
        setSalvando(false);
        const msgToast = traduzirErroSupabase(erroContrato.message);
      setErroFormulario(msgToast);
      toast(msgToast, "erro");
        return;
      }
    }

    setSalvando(false);
    setAditivoExcluindo(null);
    toast("Aditivo excluído.");
    await carregar();
    await carregarAditivos();
  }

  const dias = contrato ? diasParaVencer(contrato.data_fim) : null;
  const status = contrato ? statusEfetivo(contrato) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Voltar para a lista" onClick={() => navegar("/contratos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {contrato ? `Contrato ${contrato.numero}` : "Contrato"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Visualização dos dados completos do contrato
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navegar("/contratos")}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          {podeEditar && contrato && (
            <Button onClick={() => navegar(`/contratos?editar=${contrato.id}`)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {carregando && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contrato…
        </div>
      )}

      {!carregando && erro && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" onClick={() => navegar("/contratos")}>
              Voltar para a lista
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && contrato && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSignature className="h-4 w-4 text-muted-foreground" />
                  Dados do contrato
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{contrato.objeto}</p>
              </div>
              <Badge variant={varianteStatus(status ?? contrato.status)}>
                {rotuloStatus(status ?? contrato.status)}
              </Badge>
            </CardHeader>
            <CardContent>
              <dl>
                <Linha
                  rotulo="Número do contrato"
                  valor={contrato.numero}
                  icone={<Hash className="h-3.5 w-3.5" />}
                />
                <Linha
                  rotulo="Fornecedor"
                  valor={contrato.fornecedor}
                />
                <Linha
                  rotulo="CNPJ"
                  valor={contrato.cnpj ?? "Não informado"}
                />
                <Linha
                  rotulo="Modalidade de contratação"
                  valor={contrato.modalidade}
                />
                <Linha
                  rotulo="Processo administrativo"
                  valor={contrato.processo ?? "Não informado"}
                />
                <Linha
                  rotulo="Valor total"
                  valor={formatarMoeda(Number(contrato.valor ?? 0))}
                />
                <Linha
                  rotulo="Valor original"
                  valor={
                    contrato.valor_original !== null && contrato.valor_original !== undefined
                      ? formatarMoeda(Number(contrato.valor_original))
                      : "Não informado"
                  }
                />
                <Linha
                  rotulo="Vigência"
                  valor={`${formatarDataISO(contrato.data_inicio)} a ${formatarDataISO(contrato.data_fim)}`}
                  icone={<CalendarDays className="h-3.5 w-3.5" />}
                />
                <Linha
                  rotulo="Vigência original"
                  valor={
                    contrato.vigencia_original_inicio || contrato.vigencia_original_fim
                      ? `${formatarDataISO(contrato.vigencia_original_inicio)} a ${formatarDataISO(contrato.vigencia_original_fim)}`
                      : "Não informada"
                  }
                  icone={<CalendarDays className="h-3.5 w-3.5" />}
                />
              </dl>

              {dias !== null && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${
                    dias < 0
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : dias <= 60
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {dias < 0
                      ? `Vigência encerrada há ${Math.abs(dias)} dia(s).`
                      : dias === 0
                        ? "O contrato vence hoje."
                        : `Faltam ${dias} dia(s) para o término da vigência.`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Aditivos
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prorrogações, alterações de vigência e aditamentos de valor registradas para
                  este contrato.
                </p>
              </div>
              {podeEditar && (
                <Button variant="outline" size="sm" onClick={abrirAditivo}>
                  <Plus className="h-4 w-4" />
                  Aditar contrato
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {aditivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum aditivo registrado para este contrato.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-6">
                  {aditivosDaPagina.map((aditivo, indicePagina) => {
                    const indice =
                      paginaAditivosAtual * ADITIVOS_POR_PAGINA + indicePagina;
                    const ehUltimo =
                      aditivo.data_fim === contrato.data_fim || indice === 0;
                    const diasAditivo = diasParaVencer(aditivo.data_fim);
                    return (
                      <li key={aditivo.id} className="relative">
                        <span
                          className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${
                            ehUltimo ? "bg-primary" : "bg-muted-foreground/60"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">Aditivo {aditivo.numero}</p>
                          {ehUltimo ? (
                            <Badge variant="success">Vigência atual</Badge>
                          ) : (
                            <Badge variant="muted">Histórico</Badge>
                          )}
                          {podeEditar && (
                            <div className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Editar aditivo ${aditivo.numero}`}
                                onClick={() => abrirEdicaoAditivo(aditivo)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Excluir aditivo ${aditivo.numero}`}
                                onClick={() => {
                                  setErroFormulario(null);
                                  setAditivoExcluindo(aditivo);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </Button>
                            </div>
                          )}
                        </div>
                        <dl className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                          <div className="flex gap-1.5">
                            <dt>Data do aditivo:</dt>
                            <dd className="text-foreground">{formatarDataISO(aditivo.data_aditivo)}</dd>
                          </div>
                          <div className="flex gap-1.5">
                            <dt>Nova vigência:</dt>
                            <dd className="text-foreground">
                              {formatarDataISO(aditivo.data_inicio)} a {formatarDataISO(aditivo.data_fim)}
                            </dd>
                          </div>
                          {aditivo.tipo_valor && aditivo.tipo_valor !== "inalterado" && (
                            <div className="flex gap-1.5">
                              <dt>Valor:</dt>
                              <dd className="text-foreground">
                                {formatarMoeda(Number(aditivo.valor_anterior ?? 0))} →{" "}
                                {formatarMoeda(Number(aditivo.valor_novo ?? 0))} (
                                {aditivo.tipo_valor === "acrescimo" ? "acréscimo" : "redução"})
                              </dd>
                            </div>
                          )}
                          {aditivo.observacoes && (
                            <div className="flex gap-1.5">
                              <dt>Observações:</dt>
                              <dd className="text-foreground">{aditivo.observacoes}</dd>
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <dt>Registrado em:</dt>
                            <dd className="text-foreground">{formatarDataHora(aditivo.criado_em)}</dd>
                          </div>
                        </dl>
                        {ehUltimo && diasAditivo !== null && (
                          <p
                            className={`mt-1 text-xs font-medium ${
                              diasAditivo < 0
                                ? "text-destructive"
                                : diasAditivo <= 60
                                  ? "text-amber-700"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {diasAditivo < 0
                              ? `Vigência encerrada há ${Math.abs(diasAditivo)} dia(s).`
                              : `Faltam ${diasAditivo} dia(s) para o término da vigência.`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {aditivos.length > ADITIVOS_POR_PAGINA && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    Página {paginaAditivosAtual + 1} de {totalPaginasAditivos} · {aditivos.length}{" "}
                    aditivo(s)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAditivosAtual === 0}
                      onClick={() => setPaginaAditivos(paginaAditivosAtual - 1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Anteriores
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAditivosAtual >= totalPaginasAditivos - 1}
                      onClick={() => setPaginaAditivos(paginaAditivosAtual + 1)}
                    >
                      Próximos
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {contrato.observacoes?.trim() || "Nenhuma observação registrada."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Linha rotulo="Criado em" valor={formatarDataHora(contrato.criado_em)} />
                <Linha
                  rotulo="Última atualização"
                  valor={formatarDataHora(contrato.atualizado_em)}
                />
              </dl>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            Precisa corrigir alguma informação?{" "}
            <Link to="/contratos" className="font-medium text-primary underline-offset-4 hover:underline">
              Volte à lista de contratos
            </Link>
            .
          </p>
        </>
      )}

      <Dialog
        aberto={aditivoEditando !== null}
        titulo="Editar aditivo"
        descricao={
          aditivoEditando
            ? `Altere os dados do aditivo ${aditivoEditando.numero}.`
            : undefined
        }
        aoFechar={() => setAditivoEditando(null)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setAditivoEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarEdicaoAditivo()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
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
              <Label htmlFor="edicao-numero">Número do aditivo *</Label>
              <Input
                id="edicao-numero"
                className="mt-1"
                value={formularioEdicao.numero}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({ ...atual, numero: evento.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edicao-data">Data do aditivo *</Label>
              <Input
                id="edicao-data"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formularioEdicao.data_aditivo}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({ ...atual, data_aditivo: evento.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edicao-inicio">Início da nova vigência</Label>
              <Input
                id="edicao-inicio"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formularioEdicao.data_inicio}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({ ...atual, data_inicio: evento.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edicao-fim">Término da nova vigência *</Label>
              <Input
                id="edicao-fim"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formularioEdicao.data_fim}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({ ...atual, data_fim: evento.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edicao-tipo-valor">Alteração de valor</Label>
              <Select
                id="edicao-tipo-valor"
                className="mt-1"
                value={formularioEdicao.tipo_valor}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({
                    ...atual,
                    tipo_valor: evento.target.value as "inalterado" | "acrescimo" | "reducao",
                  }))
                }
              >
                <option value="inalterado">Manter valor</option>
                <option value="acrescimo">Acréscimo</option>
                <option value="reducao">Redução</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edicao-valor">Valor do aditivo (R$)</Label>
              <Input
                id="edicao-valor"
                className="mt-1"
                inputMode="decimal"
                disabled={formularioEdicao.tipo_valor === "inalterado"}
                value={formularioEdicao.valor_aditivo}
                onChange={(evento) =>
                  setFormularioEdicao((atual) => ({ ...atual, valor_aditivo: evento.target.value }))
                }
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edicao-observacoes">Observações</Label>
            <Textarea
              id="edicao-observacoes"
              className="mt-1"
              value={formularioEdicao.observacoes}
              onChange={(evento) =>
                setFormularioEdicao((atual) => ({ ...atual, observacoes: evento.target.value }))
              }
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        aberto={aditivoExcluindo !== null}
        titulo="Excluir aditivo"
        descricao={
          aditivoExcluindo
            ? `O aditivo ${aditivoExcluindo.numero} será removido definitivamente.`
            : undefined
        }
        aoFechar={() => setAditivoExcluindo(null)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setAditivoExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void excluirAditivo()}
              disabled={salvando}
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir aditivo
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          {erroFormulario && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{erroFormulario}</span>
            </div>
          )}
          <p>
            Esta ação não pode ser desfeita. Se o aditivo removido for o que define a vigência
            atual, o contrato voltará à vigência do aditivo anterior ou, se não houver, à
            vigência original.
          </p>
        </div>
      </Dialog>

      <Dialog
        aberto={dialogoAditivo}
        titulo="Aditivar contrato"
        descricao={
          contrato
            ? `Informe os dados do aditivo do contrato ${contrato.numero}. A nova vigência será aplicada ao contrato.`
            : undefined
        }
        aoFechar={() => setDialogoAditivo(false)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setDialogoAditivo(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarAditivo()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar aditivo
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
              <Label htmlFor="aditivo-numero">Número do aditivo *</Label>
              <Input
                id="aditivo-numero"
                className="mt-1"
                value={formulario.numero}
                onChange={(evento) => alterar("numero", evento.target.value)}
                placeholder="Ex.: 001/2026"
              />
            </div>
            <div>
              <Label htmlFor="aditivo-data">Data do aditivo *</Label>
              <Input
                id="aditivo-data"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formulario.data_aditivo}
                onChange={(evento) => alterar("data_aditivo", evento.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="aditivo-inicio">Início da nova vigência</Label>
              <Input
                id="aditivo-inicio"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formulario.data_inicio}
                onChange={(evento) => alterar("data_inicio", evento.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="aditivo-fim">Término da nova vigência *</Label>
              <Input
                id="aditivo-fim"
                className="mt-1"
                placeholder="dd/mm/aaaa"
                value={formulario.data_fim}
                onChange={(evento) => alterar("data_fim", evento.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="aditivo-tipo-valor">Alteração de valor</Label>
              <Select
                id="aditivo-tipo-valor"
                className="mt-1"
                value={formulario.tipo_valor}
                onChange={(evento) =>
                  alterar("tipo_valor", evento.target.value as "inalterado" | "acrescimo" | "reducao")
                }
              >
                <option value="inalterado">Manter valor ({formatarMoeda(Number(contrato?.valor ?? 0))})</option>
                <option value="acrescimo">Acréscimo</option>
                <option value="reducao">Redução</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="aditivo-valor">Valor do aditivo (R$)</Label>
              <Input
                id="aditivo-valor"
                className="mt-1"
                inputMode="decimal"
                disabled={formulario.tipo_valor === "inalterado"}
                value={formulario.valor_aditivo}
                onChange={(evento) => alterar("valor_aditivo", evento.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="aditivo-observacoes">Observações</Label>
            <Textarea
              id="aditivo-observacoes"
              className="mt-1"
              value={formulario.observacoes}
              onChange={(evento) => alterar("observacoes", evento.target.value)}
              placeholder="Objeto do aditivo, justificativa, base legal…"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
