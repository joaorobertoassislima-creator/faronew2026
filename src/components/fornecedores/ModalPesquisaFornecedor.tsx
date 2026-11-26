import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dialog from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  formatarDocumento,
  rotuloStatusFornecedor,
  somenteDigitos,
  varianteStatusFornecedor,
  type Fornecedor,
} from "@/lib/fornecedores";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionar: (fornecedor: Fornecedor) => void;
}

/** Colunas com filtro individual (balão com "Contém:"). */
const COLUNAS_FILTRO = [
  { chave: "razao_social", rotulo: "Razão social" },
  { chave: "nome_fantasia", rotulo: "Nome fantasia" },
  { chave: "cnpj", rotulo: "CNPJ" },
  { chave: "cidade_uf", rotulo: "Cidade/UF" },
  { chave: "natureza_social", rotulo: "Natureza social" },
] as const;

type ChaveFiltro = (typeof COLUNAS_FILTRO)[number]["chave"];

const POR_PAGINA = 10;

function textoColuna(fornecedor: Fornecedor, chave: ChaveFiltro): string {
  switch (chave) {
    case "cnpj":
      return somenteDigitos(fornecedor.cnpj);
    case "cidade_uf":
      return [fornecedor.cidade, fornecedor.uf].filter(Boolean).join(" ");
    default:
      return String(fornecedor[chave] ?? "");
  }
}

/**
 * Modal de Pesquisa Avançada de fornecedores: tabela paginada com filtros
 * por coluna (ícone de funil que abre um balão com a opção "Contém:").
 */
export default function ModalPesquisaFornecedor({
  aberto,
  aoFechar,
  aoSelecionar,
}: Props) {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [baloesAbertos, setBaloesAbertos] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("razao_social", { ascending: true })
      .limit(500);
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
      setFornecedores([]);
    } else {
      setFornecedores((data as Fornecedor[]) ?? []);
    }
    setCarregando(false);
  }

  useEffect(() => {
    if (!aberto) return;
    void carregar();
    setBusca("");
    setFiltros({});
    setBaloesAbertos(null);
    setPagina(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fornecedores.filter((fornecedor) => {
      if (termo) {
        const alvo = [
          fornecedor.razao_social,
          fornecedor.nome_fantasia ?? "",
          fornecedor.cnpj ?? "",
          fornecedor.cidade ?? "",
          fornecedor.uf ?? "",
          fornecedor.natureza_social ?? "",
          fornecedor.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      for (const coluna of COLUNAS_FILTRO) {
        const filtro = (filtros[coluna.chave] ?? "").trim().toLowerCase();
        if (!filtro) continue;
        const valor = textoColuna(fornecedor, coluna.chave).toLowerCase();
        if (!valor.includes(filtro)) return false;
      }
      return true;
    });
  }, [fornecedores, busca, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const daPagina = filtrados.slice(
    paginaAtual * POR_PAGINA,
    paginaAtual * POR_PAGINA + POR_PAGINA,
  );

  function alternarBalao(chave: string) {
    setBaloesAbertos((atual) => (atual === chave ? null : chave));
  }

  function definirFiltro(chave: string, valor: string) {
    setFiltros((atual) => ({ ...atual, [chave]: valor }));
    setPagina(0);
  }

  function selecionar(fornecedor: Fornecedor) {
    aoSelecionar(fornecedor);
    aoFechar();
  }

  function cabecalhoComFiltro(chave: ChaveFiltro, rotulo: string) {
    const aberto = baloesAbertos === chave;
    return (
      <th className="relative px-3 py-3 font-medium">
        <div className="flex items-center gap-1">
          <span>{rotulo}</span>
          <button
            type="button"
            aria-label={`Filtrar por ${rotulo}`}
            title={`Filtrar por ${rotulo}`}
            onClick={() => alternarBalao(chave)}
            className={`rounded p-0.5 transition-colors hover:bg-muted ${
              filtros[chave] ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
        {aberto && (
          <div className="absolute left-2 top-full z-20 w-64 rounded-lg border border-border bg-card p-3 text-left shadow-lg">
            <Label className="text-xs" htmlFor={`filtro-${chave}`}>
              Contém:
            </Label>
            <Input
              id={`filtro-${chave}`}
              className="mt-1 h-8 text-sm"
              autoFocus
              value={filtros[chave] ?? ""}
              onChange={(evento) => definirFiltro(chave, evento.target.value)}
              placeholder="Digite para filtrar…"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => definirFiltro(chave, "")}
              >
                Limpar
              </Button>
              <Button size="sm" onClick={() => setBaloesAbertos(null)}>
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </th>
    );
  }

  return (
    <Dialog
      aberto={aberto}
      titulo="Pesquisa avançada de fornecedores"
      descricao="Use os ícones de funil nos cabeçalhos para filtrar colunas. Selecione um fornecedor pelo botão Selecionar ou com duplo clique na linha."
      aoFechar={aoFechar}
      largura="max-w-5xl"
      rodape={
        <>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            {filtrados.length} fornecedor(es) encontrado(s)
          </span>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="busca-fornecedor">Buscar</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="busca-fornecedor"
              className="pl-9"
              placeholder="Razão social, nome fantasia, CNPJ, cidade…"
              value={busca}
              onChange={(evento) => {
                setBusca(evento.target.value);
                setPagina(0);
              }}
            />
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fornecedores…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {COLUNAS_FILTRO.map((coluna) =>
                    cabecalhoComFiltro(coluna.chave, coluna.rotulo),
                  )}
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {daPagina.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUNAS_FILTRO.length + 2}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum fornecedor encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
                {daPagina.map((fornecedor) => (
                  <tr
                    key={fornecedor.id}
                    onDoubleClick={() => selecionar(fornecedor)}
                    className="cursor-pointer border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-medium">{fornecedor.razao_social}</td>
                    <td className="px-3 py-2">{fornecedor.nome_fantasia ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatarDocumento(fornecedor.cnpj)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {[fornecedor.cidade, fornecedor.uf].filter(Boolean).join(" - ") || "—"}
                    </td>
                    <td className="px-3 py-2">{fornecedor.natureza_social ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={varianteStatusFornecedor(fornecedor.status)}>
                        {rotuloStatusFornecedor(fornecedor.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selecionar(fornecedor)}
                      >
                        Selecionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {paginaAtual + 1} de {totalPaginas} · {filtrados.length} fornecedor(es)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual === 0}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anteriores
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual >= totalPaginas - 1}
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              >
                Próximos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
