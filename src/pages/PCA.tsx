import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderOpen,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { traduzirErroSupabase } from "@/lib/erros";
import {
  STATUS_CATALOGO,
  exerciciosSugeridos,
  formatarDataPCA,
  formatarMoedaPCA,
  rotuloStatusCatalogo,
  varianteStatusCatalogo,
  type CatalogoPCA,
} from "@/lib/pca";

interface FormularioCatalogo {
  id_pncp: string;
  exercicio: string;
  data_publicacao: string;
  status: string;
  observacoes: string;
}

const FORMULARIO_VAZIO: FormularioCatalogo = {
  id_pncp: "",
  exercicio: String(new Date().getFullYear()),
  data_publicacao: "",
  status: "rascunho",
  observacoes: "",
};

const POR_PAGINA = 10;

interface Contagens {
  gerais: number;
  especificos: number;
  classes: number;
  valor: number;
}

export default function PCA() {
  const { papeis } = useAuth();
  const { toast } = useToast();
  const navegar = useNavigate();
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [catalogos, setCatalogos] = useState<CatalogoPCA[]>([]);
  const [contagens, setContagens] = useState<Record<string, Contagens>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroExercicio, setFiltroExercicio] = useState("todos");
  const [pagina, setPagina] = useState(0);

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<CatalogoPCA | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioCatalogo>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<CatalogoPCA | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data, error } = await supabase
      .from("pca_catalogos")
      .select("*")
      .order("exercicio", { ascending: false })
      .order("data_publicacao", { ascending: false, nullsFirst: false });

    if (error) {
      const mensagem = traduzirErroSupabase(error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setCatalogos([]);
      setCarregando(false);
      return;
    }

    const lista = (data as CatalogoPCA[]) ?? [];
    setCatalogos(lista);

    const { data: gerais } = await supabase
      .from("pca_itens_gerais")
      .select("catalogo_id");
    const { data: especificos } = await supabase
      .from("pca_itens_especificos")
      .select("catalogo_id");
    const { data: classes } = await supabase
      .from("pca_classes")
      .select("catalogo_id, valor");

    const mapa: Record<string, Contagens> = {};
    for (const catalogo of lista) {
      mapa[catalogo.id] = { gerais: 0, especificos: 0, classes: 0, valor: 0 };
    }
    for (const item of (gerais ?? []) as { catalogo_id: string }[]) {
      if (mapa[item.catalogo_id]) mapa[item.catalogo_id].gerais += 1;
    }
    for (const item of (especificos ?? []) as { catalogo_id: string }[]) {
      if (mapa[item.catalogo_id]) mapa[item.catalogo_id].especificos += 1;
    }
    for (const item of (classes ?? []) as {
      catalogo_id: string;
      valor: number | string | null;
    }[]) {
      if (!mapa[item.catalogo_id]) continue;
      mapa[item.catalogo_id].classes += 1;
      mapa[item.catalogo_id].valor += Number(item.valor ?? 0);
    }
    setContagens(mapa);
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return catalogos.filter((catalogo) => {
      if (filtroStatus !== "todos" && catalogo.status !== filtroStatus) {
        return false;
      }
      if (
        filtroExercicio !== "todos" &&
        String(catalogo.exercicio) !== filtroExercicio
      ) {
        return false;
      }
      if (!termo) return true;
      return `${catalogo.id_pncp} ${catalogo.observacoes ?? ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [catalogos, busca, filtroStatus, filtroExercicio]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const catalogosDaPagina = filtrados.slice(
    paginaAtual * POR_PAGINA,
    paginaAtual * POR_PAGINA + POR_PAGINA,
  );

  useEffect(() => {
    setPagina(0);
  }, [busca, filtroStatus, filtroExercicio]);

  const totais = useMemo(() => {
    const exercicioAtual = new Date().getFullYear();
    let valorTotal = 0;
    let valorExercicio = 0;
    let classes = 0;
    for (const catalogo of catalogos) {
      const contagem = contagens[catalogo.id];
      if (!contagem) continue;
      valorTotal += contagem.valor;
      classes += contagem.classes;
      if (catalogo.exercicio === exercicioAtual) {
        valorExercicio += contagem.valor;
      }
    }
    return {
      totalCatalogos: catalogos.length,
      totalClasses: classes,
      valorTotal,
      valorExercicio,
      exercicioAtual,
    };
  }, [catalogos, contagens]);

  function abrirNovoCatalogo() {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(catalogo: CatalogoPCA) {
    setEditando(catalogo);
    setFormulario({
      id_pncp: catalogo.id_pncp ?? "",
      exercicio: String(catalogo.exercicio ?? new Date().getFullYear()),
      data_publicacao: catalogo.data_publicacao ?? "",
      status: catalogo.status ?? "rascunho",
      observacoes: catalogo.observacoes ?? "",
    });
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  async function salvar() {
    const idPncp = formulario.id_pncp.trim();
    if (!idPncp) {
      setErroFormulario("Informe o ID PNCP do catálogo.");
      return;
    }
    const exercicio = Number(formulario.exercicio);
    if (!Number.isFinite(exercicio) || exercicio < 2000 || exercicio > 2100) {
      setErroFormulario("Informe um exercício válido (entre 2000 e 2100).");
      return;
    }
    setSalvando(true);
    setErroFormulario(null);
    const dados = {
      id_pncp: idPncp,
      exercicio,
      data_publicacao: formulario.data_publicacao || null,
      status: formulario.status,
      observacoes: formulario.observacoes.trim() || null,
      atualizado_em: new Date().toISOString(),
    };
    const resultado = editando
      ? await supabase.from("pca_catalogos").update(dados).eq("id", editando.id)
      : await supabase
          .from("pca_catalogos")
          .insert({ ...dados, valor_total: 0 });
    setSalvando(false);
    if (resultado.error) {
      const mensagem = traduzirErroSupabase(resultado.error.message);
      setErroFormulario(mensagem);
      toast(mensagem, "erro");
      return;
    }
    setDialogoAberto(false);
    toast(
      editando
        ? "Catálogo PCA atualizado com sucesso."
        : "Catálogo PCA criado com sucesso.",
    );
    await carregar();
  }

  async function recalcularValor(catalogo: CatalogoPCA) {
    const { data, error } = await supabase
      .from("pca_classes")
      .select("valor")
      .eq("catalogo_id", catalogo.id);
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
      return;
    }
    const total = (data ?? []).reduce(
      (soma, item) => soma + Number((item as { valor: number }).valor ?? 0),
      0,
    );
    const { error: erroUpdate } = await supabase
      .from("pca_catalogos")
      .update({ valor_total: total, atualizado_em: new Date().toISOString() })
      .eq("id", catalogo.id);
    if (erroUpdate) {
      toast(traduzirErroSupabase(erroUpdate.message), "erro");
      return;
    }
    toast("Valor total do catálogo recalculado.");
    await carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    const { error } = await supabase
      .from("pca_catalogos")
      .delete()
      .eq("id", excluindo.id);
    setProcessandoExclusao(false);
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
      return;
    }
    setExcluindo(null);
    toast("Catálogo PCA excluído com sucesso.");
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            PCA - Plano de Contratações Anual
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogos PCA com estrutura hierárquica de itens gerais, itens
            específicos e classes/grupos.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={abrirNovoCatalogo}>
            <Plus className="h-4 w-4" />
            Novo catálogo
          </Button>
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="space-y-1 p-4 text-sm text-blue-900">
          <p className="font-medium">Estrutura hierárquica do PCA</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              <strong>Nível 1 - Item Geral:</strong> código 1.00.00 (ex: MATERIAL)
            </li>
            <li>
              <strong>Nível 2 - Item Específico:</strong> código 1.01.00 (ex:
              MATERIAL DE LIMPEZA) - contém ID PNCP e ID Demanda
            </li>
            <li>
              <strong>Nível 3 - Classe/Grupo:</strong> código 1.01.01 (ex:
              PRODUTOS DE LIMPEZA) - contém o valor
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Catálogos PCA
            </p>
            <p className="mt-1 text-2xl font-semibold">{totais.totalCatalogos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Classes/grupos
            </p>
            <p className="mt-1 text-2xl font-semibold">{totais.totalClasses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Valor total geral
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatarMoedaPCA(totais.valorTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Exercício {totais.exercicioAtual}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatarMoedaPCA(totais.valorExercicio)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por ID PNCP ou observações"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </div>
            <Select
              className="sm:w-48"
              value={filtroStatus}
              onChange={(evento) => setFiltroStatus(evento.target.value)}
            >
              <option value="todos">Todos os status</option>
              {STATUS_CATALOGO.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </Select>
            <Select
              className="sm:w-44"
              value={filtroExercicio}
              onChange={(evento) => setFiltroExercicio(evento.target.value)}
            >
              <option value="todos">Todos os exercícios</option>
              {exerciciosSugeridos().map((ano) => (
                <option key={ano} value={String(ano)}>
                  {ano}
                </option>
              ))}
            </Select>
          </div>

          {erro && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando catálogos...
            </div>
          ) : catalogosDaPagina.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum catálogo encontrado.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">ID PNCP</th>
                      <th className="px-3 py-2">Exercício</th>
                      <th className="px-3 py-2">Publicação</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Estrutura</th>
                      <th className="px-3 py-2 text-right">Valor total</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogosDaPagina.map((catalogo) => {
                      const contagem = contagens[catalogo.id];
                      return (
                        <tr key={catalogo.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono font-semibold text-primary">
                            {catalogo.id_pncp}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {catalogo.exercicio}
                          </td>
                          <td className="px-3 py-2">
                            {formatarDataPCA(catalogo.data_publicacao)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={varianteStatusCatalogo(catalogo.status)}>
                              {rotuloStatusCatalogo(catalogo.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {contagem?.gerais ?? 0} gerais · {contagem?.especificos ?? 0}{" "}
                            específicos · {contagem?.classes ?? 0} classes
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatarMoedaPCA(contagem?.valor ?? 0)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver itens"
                                onClick={() =>
                                  navegar(`/pca/${catalogo.id}/itens`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Recalcular valor"
                                onClick={() => void recalcularValor(catalogo)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {podeEditar && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Editar"
                                    onClick={() => abrirEdicao(catalogo)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    title="Excluir"
                                    onClick={() => setExcluindo(catalogo)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {catalogosDaPagina.map((catalogo) => {
                  const contagem = contagens[catalogo.id];
                  return (
                    <div
                      key={catalogo.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold text-primary">
                            {catalogo.id_pncp}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Exercício {catalogo.exercicio} ·{" "}
                            {formatarDataPCA(catalogo.data_publicacao)}
                          </p>
                        </div>
                        <Badge variant={varianteStatusCatalogo(catalogo.status)}>
                          {rotuloStatusCatalogo(catalogo.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {contagem?.gerais ?? 0} gerais · {contagem?.especificos ?? 0}{" "}
                        específicos · {contagem?.classes ?? 0} classes
                      </p>
                      <p className="mt-1 text-right font-mono text-sm font-semibold">
                        {formatarMoedaPCA(contagem?.valor ?? 0)}
                      </p>
                      <div className="mt-3 flex flex-wrap justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navegar(`/pca/${catalogo.id}/itens`)}
                        >
                          <Layers className="h-4 w-4" />
                          Itens
                        </Button>
                        {podeEditar && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirEdicao(catalogo)}
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setExcluindo(catalogo)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPaginas > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    Página {paginaAtual + 1} de {totalPaginas} ·{" "}
                    {filtrados.length} catálogo(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAtual === 0}
                      onClick={() => setPagina(paginaAtual - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anteriores
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaAtual >= totalPaginas - 1}
                      onClick={() => setPagina(paginaAtual + 1)}
                    >
                      Próximos
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        aberto={dialogoAberto}
        titulo={editando ? "Editar catálogo PCA" : "Novo catálogo PCA"}
        descricao="Informe os dados do catálogo PCA publicado no PNCP."
        aoFechar={() => setDialogoAberto(false)}
        rodape={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {erroFormulario && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erroFormulario}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="id_pncp">ID PNCP *</Label>
              <Input
                id="id_pncp"
                value={formulario.id_pncp}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    id_pncp: evento.target.value,
                  }))
                }
                placeholder="Ex.: 00394460005887-1-000123/2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exercicio">Exercício *</Label>
              <Input
                id="exercicio"
                type="number"
                value={formulario.exercicio}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    exercicio: evento.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_publicacao">Data de publicação</Label>
              <Input
                id="data_publicacao"
                type="date"
                value={formulario.data_publicacao}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    data_publicacao: evento.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={formulario.status}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    status: evento.target.value,
                  }))
                }
              >
                {STATUS_CATALOGO.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formulario.observacoes}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    observacoes: evento.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        aberto={excluindo !== null}
        titulo="Excluir catálogo PCA"
        descricao="Todos os itens, itens específicos e classes deste catálogo serão removidos."
        aoFechar={() => setExcluindo(null)}
        rodape={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={processandoExclusao}
              onClick={() => void confirmarExclusao()}
            >
              {processandoExclusao && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          Confirma a exclusão do catálogo{" "}
          <strong className="font-mono">{excluindo?.id_pncp}</strong>?
        </p>
      </Dialog>
    </div>
  );
}
