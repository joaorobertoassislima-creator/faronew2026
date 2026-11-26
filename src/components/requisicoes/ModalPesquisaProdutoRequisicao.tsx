import { useEffect, useState } from "react";
import {
  buscarProdutos,
  type ProdutoPesquisavel,
} from "@/lib/requisicoes";

interface ModalPesquisaProdutoRequisicaoProps {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: ProdutoPesquisavel) => void;
}

export default function ModalPesquisaProdutoRequisicao({
  open,
  onClose,
  onSelect,
}: ModalPesquisaProdutoRequisicaoProps) {
  const [busca, setBusca] = useState("");
  const [filtroAplicado, setFiltroAplicado] = useState("");
  const [produtos, setProdutos] = useState<ProdutoPesquisavel[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      try {
        const resultado = await buscarProdutos({
          busca: filtroAplicado.trim() || undefined,
          pagina,
          porPagina: 5,
        });
        if (cancelado) return;
        setProdutos(resultado.dados);
        setTotal(resultado.total);
        setPaginas(resultado.paginas);
      } catch {
        if (!cancelado) setProdutos([]);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [open, filtroAplicado, pagina]);

  useEffect(() => {
    if (open) {
      setBusca("");
      setFiltroAplicado("");
      setPagina(1);
    }
  }, [open]);

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
                ) : produtos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  produtos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                      onDoubleClick={() => onSelect(p)}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">{p.nome}</td>
                      <td className="px-3 py-2 text-slate-600">{p.unidade || "-"}</td>
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
              Página {pagina} de {paginas} (Total: {total})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(Math.max(1, pagina - 1))}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="font-semibold text-slate-700">{pagina}</span>
              <button
                type="button"
                disabled={pagina >= paginas}
                onClick={() => setPagina(Math.min(paginas, pagina + 1))}
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
