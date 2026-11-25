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
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { traduzirErroSupabase } from "@/lib/erros";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import {
  diasParaVencer,
  rotuloStatus,
  varianteStatus,
  type Contrato,
} from "@/lib/contratos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dias = contrato ? diasParaVencer(contrato.data_fim) : null;

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
              <Badge variant={varianteStatus(contrato.status)}>
                {rotuloStatus(contrato.status)}
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
                  valor={`${formatarData(contrato.data_inicio)} a ${formatarData(contrato.data_fim)}`}
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
    </div>
  );
}
