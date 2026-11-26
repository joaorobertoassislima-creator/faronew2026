import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listarContratosParaVinculo, type ContratoEntrada } from "@/lib/entradas";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionar: (contrato: ContratoEntrada) => void;
}

export function ModalPesquisaContratoEntrada({ aberto, aoFechar, aoSelecionar }: Props) {
  const [busca, setBusca] = useState("");
  const [contratos, setContratos] = useState<ContratoEntrada[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setCarregando(true);
    listarContratosParaVinculo(busca)
      .then((lista) => {
        if (ativo) setContratos(lista);
      })
      .catch(() => {
        if (ativo) setContratos([]);
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
          <h3 className="text-base font-semibold">Pesquisar Contrato</h3>
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
              placeholder="Nº do contrato ou fornecedor..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-[220px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Nº Contrato</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando contratos...
                  </td>
                </tr>
              ) : contratos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                contratos.map((contrato) => (
                  <tr
                    key={contrato.id}
                    className="border-t border-border transition hover:bg-secondary/50"
                    onDoubleClick={() => aoSelecionar(contrato)}
                  >
                    <td className="px-4 py-3 font-semibold">{contrato.numero}</td>
                    <td className="px-4 py-3">{contrato.fornecedor}</td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" onClick={() => aoSelecionar(contrato)}>
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
