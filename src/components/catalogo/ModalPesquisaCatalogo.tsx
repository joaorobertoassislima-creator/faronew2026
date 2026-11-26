import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSignature, Search, Tags, X } from "lucide-react";
import {
  listarCategoriasPCA,
  listarContratosCatalogo,
  type CategoriaPCA,
  type ContratoCatalogo,
} from "@/lib/catalogoProdutos";

export type TipoPesquisaCatalogo = "categoria" | "contrato";

export interface ItemPesquisaCatalogo {
  id: string;
  texto1: string;
  texto2: string;
}

interface Props {
  tipo: TipoPesquisaCatalogo;
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionar: (item: ItemPesquisaCatalogo) => void;
}

const POR_PAGINA = 5;

export default function ModalPesquisaCatalogo({
  tipo,
  aberto,
  aoFechar,
  aoSelecionar,
}: Props) {
  const [categorias, setCategorias] = useState<CategoriaPCA[]>([]);
  const [contratos, setContratos] = useState<ContratoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtroColuna, setFiltroColuna] = useState<"col1" | "col2" | null>(null);
  const [filtroValor, setFiltroValor] = useState("");
  const [filtroAberto, setFiltroAberto] = useState<"col1" | "col2" | null>(null);
  const [valorCol1, setValorCol1] = useState("");
  const [valorCol2, setValorCol2] = useState("");

  const titulo1 = tipo === "categoria" ? "Código PCA" : "Nº Contrato";
  const titulo2 = tipo === "categoria" ? "Descrição do Item" : "Contratada";

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      if (tipo === "categoria") {
        const lista = await listarCategoriasPCA();
        setCategorias(lista);
        setContratos([]);
      } else {
        const lista = await listarContratosCatalogo();
        setContratos(lista);
        setCategorias([]);
      }
    } finally {
      setCarregando(false);
    }
  }, [tipo]);

  useEffect(() => {
    if (!aberto) return;
    setPagina(1);
    setFiltroColuna(null);
    setFiltroValor("");
    setValorCol1("");
    setValorCol2("");
    setFiltroAberto(null);
    void carregar();
  }, [aberto, carregar]);

  const todos = useMemo<{ id: string; texto1: string; texto2: string }[]>(() => {
    if (tipo === "categoria") {
      return categorias.map((c) => ({ id: c.id, texto1: c.codigo, texto2: c.descricao }));
    }
    return contratos.map((c) => ({ id: c.id, texto1: c.numero, texto2: c.fornecedor }));
  }, [tipo, categorias, contratos]);

  const filtrados = useMemo(() => {
    const termo = filtroValor.trim().toLowerCase();
    if (!filtroColuna || !termo) return todos;
    return todos.filter((item) =>
      (filtroColuna === "col1" ? item.texto1 : item.texto2).toLowerCase().includes(termo),
    );
  }, [todos, filtroColuna, filtroValor]);

  const paginaAtual = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return filtrados.slice(inicio, inicio + POR_PAGINA);
  }, [filtrados, pagina]);

  useEffect(() => {
    setTotalPaginas(Math.max(1, Math.ceil(filtrados.length / POR_PAGINA)));
    if (pagina > Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))) setPagina(1);
  }, [filtrados, pagina]);

  function aplicarFiltro(coluna: "col1" | "col2") {
    const valor = coluna === "col1" ? valorCol1 : valorCol2;
    setFiltroColuna(valor.trim() ? coluna : null);
    setFiltroValor(valor.trim() ? valor : "");
    setFiltroAberto(null);
    setPagina(1);
  }

  function limparFiltros() {
    setValorCol1("");
    setValorCol2("");
    setFiltroColuna(null);
    setFiltroValor("");
    setFiltroAberto(null);
    setPagina(1);
  }

  function selecionar(item: { id: string; texto1: string; texto2: string }) {
    aoSelecionar({ id: item.id, texto1: item.texto1, texto2: item.texto2 });
    aoFechar();
  }

  if (!aberto) return null;

  const Icone = tipo === "categoria" ? Tags : FileSignature;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={aoFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Icone className="h-4 w-4 text-primary" />
            {tipo === "categoria" ? "Pesquisar Categoria (ConPUB)" : "Pesquisar Contrato (GesCON)"}
          </h3>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar pesquisa"
            className="rounded-md border border-border p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="relative w-[30%] px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    {titulo1}
                    <button
                      type="button"
                      title="Filtrar coluna"
                      onClick={() => setFiltroAberto(filtroAberto === "col1" ? null : "col1")}
                      className={
                        filtroColuna === "col1"
                          ? "text-primary"
                          : "text-muted-foreground transition hover:text-primary"
                      }
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  {filtroAberto === "col1" && (
                    <div className="absolute left-2 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-card p-3 text-left shadow-lg">
                      <p className="mb-2 text-xs font-semibold">Filtrar</p>
                      <label className="mb-1 block text-xs text-muted-foreground">Contém:</label>
                      <input
                        value={valorCol1}
                        onChange={(e) => setValorCol1(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aplicarFiltro("col1");
                        }}
                        className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                      <div className="flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={limparFiltros}
                          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarFiltro("col1")}
                          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="relative px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    {titulo2}
                    <button
                      type="button"
                      title="Filtrar coluna"
                      onClick={() => setFiltroAberto(filtroAberto === "col2" ? null : "col2")}
                      className={
                        filtroColuna === "col2"
                          ? "text-primary"
                          : "text-muted-foreground transition hover:text-primary"
                      }
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  {filtroAberto === "col2" && (
                    <div className="absolute left-2 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-card p-3 text-left shadow-lg">
                      <p className="mb-2 text-xs font-semibold">Filtrar</p>
                      <label className="mb-1 block text-xs text-muted-foreground">Contém:</label>
                      <input
                        value={valorCol2}
                        onChange={(e) => setValorCol2(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aplicarFiltro("col2");
                        }}
                        className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                      <div className="flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={limparFiltros}
                          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarFiltro("col2")}
                          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="w-[15%] px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Carregando dados...
                  </td>
                </tr>
              )}
              {!carregando && paginaAtual.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-destructive">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {!carregando &&
                paginaAtual.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => selecionar(item)}
                    className="cursor-pointer border-t border-border transition hover:bg-secondary/60"
                  >
                    <td className="px-4 py-3 font-semibold">{item.texto1}</td>
                    <td className="px-4 py-3">{item.texto2}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => selecionar(item)}
                        className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition hover:opacity-90"
                      >
                        Selecionar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {carregando
              ? "Carregando..."
              : `Página ${pagina} de ${totalPaginas} (Total: ${filtrados.length})`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            <span className="px-1 text-sm font-bold">{pagina}</span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
