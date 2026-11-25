import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  FileSignature,
  Hash,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Dialog from "@/components/ui/dialog";

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
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [dialogoAditivo, setDialogoAditivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [formulario, setFormulario] = useState({
    numero: "",
    data_aditivo: "",
    data_inicio: "",
    data_fim: "",
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
      .order("data_aditivo", { ascending: true });
    if (error) {
      setErro(traduzirErroSupabase(error.message));
      return;
    }
    setAditivos((data as Aditivo[]) ?? []);
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

    setSalvando(true);
    setErroFormulario(null);

    const { error: erroAditivo } = await supabase.from("aditivos_contrato").insert({
      contrato_id: contrato.id,
      numero: formulario.numero.trim(),
      data_aditivo: dataAditivoIso,
      data_inicio: inicioIso,
      data_fim: fimIso,
      observacoes: formulario.observacoes.trim() || null,
    });

    if (erroAditivo) {
      setSalvando(false);
      setErroFormulario(traduzirErroSupabase(erroAditivo.message));
      return;
    }

    const { error: erroContrato } = await supabase
      .from("contratos")
      .update({
        data_inicio: inicioIso ?? contrato.data_inicio,
        data_fim: fimIso,
        status: "vigente",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", contrato.id);

    setSalvando(false);

    if (erroContrato) {
      setErroFormulario(traduzirErroSupabase(erroContrato.message));
      return;
    }

    setDialogoAditivo(false);
    setMensagem("Aditivo registrado e vigência do contrato atualizada.");
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

      {mensagem && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {mensagem}
        </div>
      )}

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
                  rotulo="Vigência"
                  valor={`${formatarDataISO(contrato.data_inicio)} a ${formatarDataISO(contrato.data_fim)}`}
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
                  Prorrogações e alterações de vigência registradas para este contrato.
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
                  {aditivos.map((aditivo, indice) => {
                    const ehUltimo = indice === aditivos.length - 1;
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
