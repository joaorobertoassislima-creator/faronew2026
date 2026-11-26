import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listarProdutosAtivos, type ProdutoEntrada } from "@/lib/entradas";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionar: (produto: ProdutoEntrada) => void;
}

export function ModalPesquisaProdutoEntrada({ aberto, aoFechar, aoSelecionar }: Props) {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<ProdutoEntrada[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setCarregando(true);
    listarProdutosAtivos(busca)
      .then((lista) => {
        if (ativo) setProdutos(lista);
      })
      .catch(() => {
        if (ativo) setProdutos([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [aberto, busca]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">Pesquisar Produto</h3>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded p-1 text-muted-foreground transition hover:bg-secondary"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border bg-muted/20 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do produto..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-[220px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Nome do Produto</th>
                <th className="px-4 py-3">Und. Medida</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando produtos...
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtos.map((produto) => (
                  <tr
                    key={produto.id}
                    className="border-t border-border transition hover:bg-secondary/50"
                    onDoubleClick={() => aoSelecionar(produto)}
                  >
                    <td className="px-4 py-3 font-semibold">{produto.nome}</td>
                    <td className="px-4 py-3">{produto.unidade_sigla ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        onClick={() => aoSelecionar(produto)}
                      >
                        Selecionar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end border-t border-border bg-muted/20 px-5 py-3">
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
