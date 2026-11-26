import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dialog from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/** Produto do catálogo exibido na tabela da modal. */
export interface ProdutoPesquisa {
  id: string;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  unidade_id: string | null;
  contrato_id: string | null;
  item_pca_id: string | null;
  saldo_licitado: number;
  controla_lote: boolean;
  ativo: boolean;
}

interface Props {
  /** Abre/fecha a modal. */
  aberto: boolean;
  /** Callback de fechamento. */
  aoFechar: () => void;
  /** Recebe o produto escolhido na tabela. */
  aoSelecionar: (produto: ProdutoPesquisa) => void;
  /** Item do PCA (nível 4) que já está vinculado, para destacar o vínculo. */
  itemSelecionadoId?: string | null;
  /** Título exibido no topo da modal. */
  titulo?: string;
  /** Descrição exibida abaixo do título. */
  descricao?: string;
}

const POR_PAGINA = 10;

function formatarSaldo(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Modal de pesquisa de produtos do catálogo: tabela paginada com busca por
 * nome/descrição, usada para vincular produtos aos itens de nível 4 do PCA.
 */
export default function ModalPesquisaProduto({
  aberto,
  aoFechar,
  aoSelecionar,
  itemSelecionadoId,
  titulo = "Pesquisa de produtos do catálogo",
  descricao = "Selecione o produto que será vinculado ao item do PCA. O vínculo pode ser feito também pela página Catálogo de Produtos.",
}: Props) {
  const [produtos, setProdutos] = useState<ProdutoPesquisa[]>([]);
  const [contratos, setContratos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);

  async function carregar() {
    setCarregando(true);
    setErro(null);

    const [produtosRes, contratosRes] = await Promise.all([
      supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true })
        .limit(1000),
      supabase.from("contratos").select("id, numero").limit(500),
    ]);

    if (produtosRes.error) {
      setErro(traduzirErroSupabase(produtosRes.error.message));
      setProdutos([]);
    } else {
      setProdutos((produtosRes.data as ProdutoPesquisa[]) ?? []);
    }

    const mapa: Record<string, string> = {};
    for (const contrato of (contratosRes.data as { id: string; numero: string }[]) ?? []) {
      mapa[contrato.id] = contrato.numero;
    }
    setContratos(mapa);
    setCarregando(false);
  }

  useEffect(() => {
    if (!aberto) return;
    void carregar();
    setBusca("");
    setPagina(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((produto) =>
      [produto.nome, produto.descricao ?? "", contratos[produto.contrato_id ?? ""] ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [produtos, busca, contratos]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const daPagina = filtrados.slice(
    paginaAtual * POR_PAGINA,
    paginaAtual * POR_PAGINA + POR_PAGINA,
  );

  function selecionar(produto: ProdutoPesquisa) {
    aoSelecionar(produto);
    aoFechar();
  }

  return (
    <Dialog
      aberto={aberto}
      titulo={titulo}
      descricao={descricao}
      aoFechar={aoFechar}
      largura="max-w-4xl"
      rodape={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {filtrados.length} produto(s) encontrado(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Página anterior"
              disabled={paginaAtual === 0}
              onClick={() => setPagina(paginaAtual - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {paginaAtual + 1} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próxima página"
              disabled={paginaAtual >= totalPaginas - 1}
              onClick={() => setPagina(paginaAtual + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={busca}
            onChange={(evento) => {
              setBusca(evento.target.value);
              setPagina(0);
            }}
            placeholder="Buscar produto pelo nome, descrição ou contrato..."
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando produtos...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Produto</th>
                  <th className="px-3 py-3 text-left font-medium">Contrato</th>
                  <th className="px-3 py-3 text-left font-medium">Saldo</th>
                  <th className="px-3 py-3 text-left font-medium">Vínculo</th>
                  <th className="px-3 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {daPagina.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  daPagina.map((produto) => {
                    const vinculado =
                      !!itemSelecionadoId && produto.item_pca_id === itemSelecionadoId;
                    return (
                      <tr
                        key={produto.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40"
                        onDoubleClick={() => selecionar(produto)}
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium">{produto.nome}</p>
                          {produto.descricao && (
                            <p className="text-xs text-muted-foreground">
                              {produto.descricao}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {produto.contrato_id ? (
                            contratos[produto.contrato_id] ?? "—"
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {formatarSaldo(Number(produto.saldo_licitado ?? 0))}
                        </td>
                        <td className="px-3 py-2">
                          {vinculado ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Vinculado a este item
                            </Badge>
                          ) : produto.item_pca_id ? (
                            <span className="text-xs text-muted-foreground">
                              Vinculado a outro item
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem vínculo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => selecionar(produto)}
                          >
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dialog>
  );
}
