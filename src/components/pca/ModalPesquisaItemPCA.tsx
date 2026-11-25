import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dialog from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
/** Resumo de contrato usado apenas para exibir o número no vínculo atual. */
export interface ContratoResumo {
  id: string;
  numero: string;
}

/** Item do PCA (nível 4 - item código contrato) com dados de apoio para exibição. */
export interface ItemPCAPesquisa {
  id: string;
  catalogo_id: string;
  classe_id: string;
  codigo: string;
  descricao: string;
  contrato_id: string | null;
  classe?: { codigo: string; descricao: string } | null;
  catalogo?: { id_pncp: string; exercicio: number } | null;
}

interface Props {
  /** Abre/fecha a modal. */
  aberto: boolean;
  /** Callback de fechamento. */
  aoFechar: () => void;
  /** Recebe o item escolhido na tabela. */
  aoSelecionar: (item: ItemPCAPesquisa) => void;
  /** Contrato já vinculado aos itens listados, para destacar o vínculo. */
  contratoSelecionadoId?: string | null;
  /** Título exibido no topo da modal. */
  titulo?: string;
  /** Descrição exibida abaixo do título. */
  descricao?: string;
}

/** Colunas com filtro individual (balão com "Contém:"). */
const COLUNAS_FILTRO = [
  { chave: "codigo", rotulo: "Código" },
  { chave: "descricao", rotulo: "Descrição" },
  { chave: "classe", rotulo: "Classe/grupo" },
  { chave: "catalogo", rotulo: "Catálogo" },
] as const;

type ChaveFiltro = (typeof COLUNAS_FILTRO)[number]["chave"];

const POR_PAGINA = 10;

function textoColuna(item: ItemPCAPesquisa, chave: ChaveFiltro): string {
  switch (chave) {
    case "classe":
      return item.classe
        ? `${item.classe.codigo} ${item.classe.descricao}`
        : "";
    case "catalogo":
      return item.catalogo
        ? `${item.catalogo.id_pncp} ${item.catalogo.exercicio}`
        : "";
    default:
      return String(item[chave] ?? "");
  }
}

/**
 * Modal de pesquisa de itens do PCA: tabela paginada com filtros por coluna
 * (ícone de funil que abre um balão com a opção "Contém:").
 */
export default function ModalPesquisaItemPCA({
  aberto,
  aoFechar,
  aoSelecionar,
  contratoSelecionadoId,
  titulo = "Pesquisa de itens do PCA",
  descricao = "Use os ícones de funil nos cabeçalhos para filtrar colunas. Selecione um item pelo botão Selecionar ou com duplo clique na linha.",
}: Props) {
  const [itens, setItens] = useState<ItemPCAPesquisa[]>([]);
  const [contratos, setContratos] = useState<Record<string, ContratoResumo>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [baloesAbertos, setBaloesAbertos] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);

  async function carregar() {
    setCarregando(true);
    setErro(null);

    const [itensRes, contratosRes] = await Promise.all([
      supabase
        .from("pca_itens_contrato")
        .select("*, pca_classes(codigo, descricao), pca_catalogos(id_pncp, exercicio)")
        .order("codigo", { ascending: true })
        .limit(1000),
      supabase.from("contratos").select("id, numero").order("numero").limit(500),
    ]);

    if (itensRes.error) {
      setErro(traduzirErroSupabase(itensRes.error.message));
      setItens([]);
    } else {
      setItens((itensRes.data as unknown as ItemPCAPesquisa[]) ?? []);
    }

    const mapa: Record<string, ContratoResumo> = {};
    for (const contrato of (contratosRes.data as ContratoResumo[]) ?? []) {
      mapa[contrato.id] = contrato;
    }
    setContratos(mapa);
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
    return itens.filter((item) => {
      if (termo) {
        const alvo = [
          item.codigo ?? "",
          item.descricao ?? "",
          item.classe?.codigo ?? "",
          item.classe?.descricao ?? "",
          item.catalogo?.id_pncp ?? "",
          contratos[item.contrato_id ?? ""]?.numero ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      for (const coluna of COLUNAS_FILTRO) {
        const filtro = (filtros[coluna.chave] ?? "").trim().toLowerCase();
        if (!filtro) continue;
        const valor = textoColuna(item, coluna.chave).toLowerCase();
        if (!valor.includes(filtro)) return false;
      }
      return true;
    });
  }, [itens, busca, filtros, contratos]);

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

  function selecionar(item: ItemPCAPesquisa) {
    aoSelecionar(item);
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
            <Label className="text-xs" htmlFor={`filtro-item-pca-${chave}`}>
              Contém:
            </Label>
            <Input
              id={`filtro-item-pca-${chave}`}
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
      titulo={titulo}
      descricao={descricao}
      aoFechar={aoFechar}
      largura="max-w-5xl"
      rodape={
        <>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            {filtrados.length} item(ns) encontrado(s)
          </span>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="busca-item-pca">Buscar</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="busca-item-pca"
              className="pl-9"
              placeholder="Código, descrição, classe, catálogo…"
              value={busca}
              onChange={(evento) => {
                setBusca(evento.target.value);
                setPagina(0);
              }}
            />
          </div>
        </div>

        {erro && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando itens do PCA…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {COLUNAS_FILTRO.map((coluna) =>
                    cabecalhoComFiltro(coluna.chave, coluna.rotulo),
                  )}
                  <th className="px-3 py-3 font-medium">Vínculo atual</th>
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
                      Nenhum item do PCA encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
                {daPagina.map((item) => {
                  const vinculado = item.contrato_id
                    ? contratos[item.contrato_id]
                    : null;
                  return (
                    <tr
                      key={item.id}
                      onDoubleClick={() => selecionar(item)}
                      className={`cursor-pointer border-t border-border hover:bg-muted/40 ${
                        item.contrato_id === contratoSelecionadoId ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono font-medium whitespace-nowrap">
                        {item.codigo}
                      </td>
                      <td className="px-3 py-2">{item.descricao ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.classe
                          ? `${item.classe.codigo} · ${item.classe.descricao}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.catalogo
                          ? `${item.catalogo.id_pncp} · ${item.catalogo.exercicio}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {vinculado ? (
                          <Badge variant="outline">{vinculado.numero}</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            não vinculado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selecionar(item)}
                        >
                          Selecionar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {paginaAtual + 1} de {totalPaginas} · {filtrados.length} item(ns)
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