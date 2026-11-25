import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  analisarArquivoPCA,
  COLUNAS_IMPORTACAO,
  decodificarArquivo,
  gerarModeloCsv,
  processarImportacaoPCA,
  type AnaliseArquivo,
  type ResultadoImportacao,
} from "@/lib/pcaImportacao";
import { formatarMoeda } from "@/lib/format";

/** Página de importação de itens de PCA a partir de arquivo CSV. */
export default function PCAImportar() {
  const { catalogoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [idPncp, setIdPncp] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [tamanhoArquivo, setTamanhoArquivo] = useState(0);
  const [analise, setAnalise] = useState<AnaliseArquivo | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    if (!catalogoId) return;
    supabase
      .from("pca_catalogos")
      .select("id_pncp")
      .eq("id", catalogoId)
      .maybeSingle()
      .then(({ data }) => setIdPncp(data?.id_pncp ?? ""));
  }, [catalogoId]);

  const limpar = useCallback(() => {
    setNomeArquivo("");
    setTamanhoArquivo(0);
    setAnalise(null);
    setResultado(null);
    setProcessando(false);
    if (inputArquivo.current) inputArquivo.current.value = "";
  }, []);

  const receberArquivo = useCallback(
    async (arquivo: File | undefined) => {
      if (!arquivo) return;
      if (!arquivo.name.toLowerCase().endsWith(".csv")) {
        toast("Formato inválido. Selecione um arquivo .csv", "erro");
        return;
      }
      const conteudo = await arquivo.arrayBuffer();
      const texto = decodificarArquivo(conteudo);
      const resultadoAnalise = analisarArquivoPCA(texto);
      setNomeArquivo(arquivo.name);
      setTamanhoArquivo(arquivo.size);
      setResultado(null);
      setAnalise(resultadoAnalise);

      if (resultadoAnalise.colunasFaltando.length > 0) {
        toast(
          `Colunas obrigatórias faltando: ${resultadoAnalise.colunasFaltando.join(", ")}`,
          "erro",
        );
      } else {
        toast(
          `Arquivo lido: ${resultadoAnalise.linhas.length} linha(s) válida(s)`,
          "sucesso",
        );
      }
    },
    [toast],
  );

  const baixarModelo = useCallback(() => {
    const conteudo = gerarModeloCsv(idPncp);
    const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `modelo_pca_${idPncp || "catalogo"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [idPncp]);

  const importar = useCallback(async () => {
    if (!catalogoId || !analise) return;
    if (analise.colunasFaltando.length > 0) {
      toast("Corrija as colunas obrigatórias antes de importar", "erro");
      return;
    }
    if (analise.linhas.length === 0) {
      toast("Não há linhas válidas para importar", "erro");
      return;
    }
    setProcessando(true);
    const saida = await processarImportacaoPCA(catalogoId, analise.linhas);
    setProcessando(false);
    setResultado(saida);
    if (saida.erros.length > 0) {
      toast(saida.erros[0], "erro");
    } else {
      toast(`Importação concluída: ${saida.processadas} linha(s) processada(s)`, "sucesso");
    }
  }, [analise, catalogoId, toast]);

  const totalValor = useMemo(
    () => (analise?.linhas ?? []).reduce((soma, linha) => soma + linha.valor, 0),
    [analise],
  );

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(`/pca/${catalogoId}/itens`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Importar itens do PCA</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo {idPncp ? `· ${idPncp}` : ""} — carregue um arquivo CSV com a hierarquia de itens.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={baixarModelo}>
          <Download className="h-4 w-4" />
          Baixar modelo CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            Como importar
          </CardTitle>
          <CardDescription>
            O CSV deve usar separador ponto e vírgula (;), codificação UTF-8 e os nomes de coluna abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Coluna</th>
                  <th className="px-3 py-2 font-medium">Obrigatória</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {COLUNAS_IMPORTACAO.map((coluna) => (
                  <tr key={coluna.chave} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{coluna.rotulo}</td>
                    <td className="px-3 py-2">
                      {coluna.obrigatoria ? (
                        <span className="text-destructive">Sim</span>
                      ) : (
                        <span className="text-muted-foreground">Opcional</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{coluna.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Use o mesmo código_geral para agrupar itens específicos e o mesmo código_especifico para
            agrupar classes. Valores aceitam vírgula ou ponto decimal.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudUpload className="h-4 w-4 text-primary" />
            Enviar arquivo CSV
          </CardTitle>
          <CardDescription>Selecione ou arraste o arquivo preenchido para importar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!nomeArquivo ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputArquivo.current?.click()}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") inputArquivo.current?.click();
              }}
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                setArrastando(false);
                void receberArquivo(evento.dataTransfer.files?.[0]);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition ${
                arrastando
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/60"
              }`}
            >
              <CloudUpload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Arraste o arquivo aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              <p className="mt-2 text-xs text-muted-foreground">Formato aceito: .csv</p>
              <input
                ref={inputArquivo}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(evento) => void receberArquivo(evento.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-emerald-900">{nomeArquivo}</p>
                <p className="text-xs text-emerald-700">
                  {formatarTamanho(tamanhoArquivo)}
                  {analise ? ` · ${analise.linhas.length} linha(s) válida(s)` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={limpar}>
                <X className="h-4 w-4" />
                Remover
              </Button>
            </div>
          )}

          {analise && analise.colunasFaltando.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Colunas obrigatórias faltando</p>
                <p className="mt-1">{analise.colunasFaltando.join(", ")}</p>
              </div>
            </div>
          )}

          {analise && analise.colunasFaltando.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Linhas válidas</p>
                <p className="text-lg font-semibold">{analise.linhas.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Linhas ignoradas</p>
                <p className="text-lg font-semibold">{analise.ignoradas.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="text-lg font-semibold">{formatarMoeda(totalValor)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void importar()} disabled={processando || !analise || analise.linhas.length === 0 || analise.colunasFaltando.length > 0}>
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {processando ? "Importando..." : "Importar dados"}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/pca/${catalogoId}/itens`)}>
              Cancelar
            </Button>
            {resultado && (
              <Button variant="ghost" onClick={limpar}>
                <RefreshCw className="h-4 w-4" />
                Importar novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {analise && analise.ignoradas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Avisos da leitura ({analise.ignoradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-muted-foreground">
              {analise.ignoradas.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {resultado.erros.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              Resultado da importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Linhas processadas</p>
                <p className="text-lg font-semibold">{resultado.processadas}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Itens gerais</p>
                <p className="text-lg font-semibold">{resultado.itensGerais}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Itens específicos</p>
                <p className="text-lg font-semibold">{resultado.itensEspecificos}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Classes/grupos</p>
                <p className="text-lg font-semibold">{resultado.classes}</p>
              </div>
            </div>

            {resultado.erros.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Erros</p>
                <ul className="mt-1 list-inside list-disc">
                  {resultado.erros.map((erro) => (
                    <li key={erro}>{erro}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => navigate(`/pca/${catalogoId}/itens`)}>
                Ver itens importados
              </Button>
              <Button variant="ghost" onClick={limpar}>
                <RefreshCw className="h-4 w-4" />
                Importar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
