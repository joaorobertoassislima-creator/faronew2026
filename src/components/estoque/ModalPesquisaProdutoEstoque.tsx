import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ProdutoEscolha {
  id: string;
  nome: string;
  controla_lote: boolean;
  estoque_atual: number;
  unidade_sigla: string | null;
}

interface ModalPesquisaProdutoEstoqueProps {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: ProdutoEscolha) => void;
}

const POR_PAGINA = 5;

export default function ModalPesquisaProdutoEstoque({
  open,
  onClose,
  onSelect,
}: ModalPesquisaProdutoEstoqueProps) {
  const [busca, setBusca] = useState("");
  const [filtroAplicado, setFiltroAplicado] = useState("");
  const [produtos, setProdutos] = useState<ProdutoEscolha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setCarregando(true);

    const carregar = async () => {
      const { data: unidades } = await supabase
        .from("unidades_medida")
        .select("id, sigla");
      const mapaUnidades = new Map<string, string>();
      for (const u of (unidades ?? []) as { id: string; sigla: string | null }[]) {
        mapaUnidades.set(u.id, u.sigla ?? "");
      }

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, controla_lote, estoque_atual, unidade_id")
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .limit(1000);

      if (cancelado) return;
      if (error) {
        setProdutos([]);
        setCarregando(false);
        return;
      }

      setProdutos(
        ((data ?? []) as {
          id: string;
          nome: string;
          controla_lote: boolean;
          estoque_atual: number;
          unidade_id: string | null;
        }[]).map((p) => ({
          id: p.id,
          nome: p.nome,
          controla_lote: p.controla_lote,
          estoque_atual: Number(p.estoque_atual ?? 0),
          unidade_sigla: p.unidade_id ? (mapaUnidades.get(p.unidade_id) ?? null) : null,
        })),
      );
      setCarregando(false);
    };

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setBusca("");
      setFiltroAplicado("");
      setPagina(1);
    }
  }, [open]);

  const filtrados = useMemo(() => {
    const termo = filtroAplicado.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [produtos, filtroAplicado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice(
    (paginaAtual - 1) * POR_PAGINA,
    (paginaAtual - 1) * POR_PAGINA + POR_PAGINA,
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">Pesquisar Produto</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Fechar
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Nome do produto contém
              </label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFiltroAplicado(busca);
                    setPagina(1);
                  }
                }}
                placeholder="Digite para filtrar..."
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFiltroAplicado(busca);
                setPagina(1);
              }}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setFiltroAplicado("");
                setPagina(1);
              }}
              className="rounded bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Limpar
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold">Nome do Produto</th>
                  <th className="px-3 py-2 font-semibold">Und.</th>
                  <th className="px-3 py-2 font-semibold">Estoque Disp.</th>
                  <th className="px-3 py-2 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Carregando dados...
                    </td>
                  </tr>
                ) : visiveis.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  visiveis.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                      onDoubleClick={() => onSelect(p)}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">{p.nome}</td>
                      <td className="px-3 py-2 text-slate-600">{p.unidade_sigla ?? "-"}</td>
                      <td className="px-3 py-2 font-semibold text-blue-600">
                        {p.estoque_atual}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(p)}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Selecionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Página {paginaAtual} de {totalPaginas} (Total: {filtrados.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina(Math.max(1, paginaAtual - 1))}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="font-semibold text-slate-700">{paginaAtual}</span>
              <button
                type="button"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina(Math.min(totalPaginas, paginaAtual + 1))}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
