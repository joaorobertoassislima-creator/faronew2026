import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { traduzirErroSupabase } from "@/lib/erros";
import {
  contemTexto,
  type Departamento,
  type UnidadeMedida,
  type UsuarioVinculado,
} from "@/lib/cadastrosBasicos";

const POR_PAGINA = 10;

type TabelaDominio = "departamentos" | "unidades_medida";

interface ItemDominio {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  ativo: boolean;
}

interface FormularioDominio {
  nome: string;
  sigla: string;
  descricao: string;
  ativo: string;
}

const FORMULARIO_VAZIO: FormularioDominio = {
  nome: "",
  sigla: "",
  descricao: "",
  ativo: "true",
};

/* -------------------------------------------------------------------------- */
/* Tabela de domínio (departamentos e unidades de medida)                      */
/* -------------------------------------------------------------------------- */

interface PropsTabelaDominio {
  tabela: TabelaDominio;
  titulo: string;
  descricao: string;
  rotuloSingular: string;
  rotuloPlural: string;
  icone: ReactNode;
  mostrarContagem?: boolean;
  contagemPorItem?: Record<string, number>;
}

function TabelaDominio({
  tabela,
  titulo,
  descricao,
  rotuloSingular,
  rotuloPlural,
  icone,
  mostrarContagem = false,
  contagemPorItem = {},
}: PropsTabelaDominio) {
  const { toast } = useToast();
  const [itens, setItens] = useState<ItemDominio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [pagina, setPagina] = useState(0);

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<ItemDominio | null>(null);
  const [formulario, setFormulario] = useState<FormularioDominio>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<ItemDominio | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      const mensagem = traduzirErroSupabase(error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setItens([]);
    } else {
      setItens((data as ItemDominio[]) ?? []);
    }
    setCarregando(false);
  }, [tabela, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(
    () =>
      itens.filter((item) => {
        if (filtroAtivo === "ativo" && !item.ativo) return false;
        if (filtroAtivo === "inativo" && item.ativo) return false;
        return contemTexto(busca, [item.nome, item.sigla, item.descricao]);
      }),
    [itens, busca, filtroAtivo],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const itensDaPagina = filtrados.slice(
    paginaAtual * POR_PAGINA,
    paginaAtual * POR_PAGINA + POR_PAGINA,
  );

  useEffect(() => {
    setPagina(0);
  }, [busca, filtroAtivo, filtrados.length]);

  function abrirNovo() {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(item: ItemDominio) {
    setEditando(item);
    setFormulario({
      nome: item.nome ?? "",
      sigla: item.sigla ?? "",
      descricao: item.descricao ?? "",
      ativo: item.ativo ? "true" : "false",
    });
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function alterar(campo: keyof FormularioDominio, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    if (!formulario.nome.trim()) {
      setErroFormulario(`Informe o nome do ${rotuloSingular.toLowerCase()}.`);
      return;
    }
    const duplicado = itens.find(
      (item) =>
        item.id !== editando?.id &&
        item.nome.trim().toLowerCase() === formulario.nome.trim().toLowerCase(),
    );
    if (duplicado) {
      setErroFormulario(`Já existe um registro chamado "${formulario.nome.trim()}".`);
      return;
    }

    setSalvando(true);
    setErroFormulario(null);

    const dados = {
      nome: formulario.nome.trim(),
      sigla: formulario.sigla.trim() || null,
      descricao: formulario.descricao.trim() || null,
      ativo: formulario.ativo === "true",
      atualizado_em: new Date().toISOString(),
    };

    const resultado = editando
      ? await supabase.from(tabela).update(dados).eq("id", editando.id)
      : await supabase.from(tabela).insert(dados);

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
        ? `${rotuloSingular} atualizado com sucesso.`
        : `${rotuloSingular} registrado com sucesso.`,
    );
    await carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const { error } = await supabase.from(tabela).delete().eq("id", excluindo.id);
    if (error) {
      const mensagem = traduzirErroSupabase(error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setExcluindo(null);
      return;
    }
    setExcluindo(null);
    toast(`${rotuloSingular} excluído.`);
    await carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icone}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
        </div>
        <Button onClick={abrirNovo} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo {rotuloSingular.toLowerCase()}
        </Button>
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p>{erro}</p>
            <Button variant="link" className="h-auto p-0" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor={`busca-${tabela}`}>Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`busca-${tabela}`}
                  className="pl-9"
                  placeholder="Nome, sigla ou descrição…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`filtro-${tabela}`}>Situação</Label>
              <Select
                id={`filtro-${tabela}`}
                className="mt-1"
                value={filtroAtivo}
                onChange={(evento) => setFiltroAtivo(evento.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando {rotuloPlural.toLowerCase()}…
        </div>
      ) : itensDaPagina.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {itens.length === 0
              ? `Nenhum registro de ${rotuloPlural.toLowerCase()} até o momento.`
              : "Nenhum registro encontrado com os filtros selecionados."}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{rotuloSingular}</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  {mostrarContagem && (
                    <th className="px-4 py-3 font-medium">Usuários</th>
                  )}
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensDaPagina.map((item) => (
                  <tr key={item.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.nome}</p>
                      {item.sigla && (
                        <Badge variant="muted" className="mt-1">
                          {item.sigla}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.descricao || "—"}
                    </td>
                    {mostrarContagem && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {contagemPorItem[item.id] ?? 0}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge variant={item.ativo ? "success" : "muted"}>
                        {item.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${rotuloSingular.toLowerCase()} ${item.nome}`}
                          title="Editar registro"
                          onClick={() => abrirEdicao(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${rotuloSingular.toLowerCase()} ${item.nome}`}
                          title="Excluir registro"
                          className="text-destructive"
                          onClick={() => setExcluindo(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página {paginaAtual + 1} de {totalPaginas} · {filtrados.length}{" "}
                registro(s)
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
        </>
      )}

      <Dialog
        aberto={dialogoAberto}
        titulo={
          editando
            ? `Editar ${rotuloSingular.toLowerCase()}: ${editando.nome}`
            : `Novo ${rotuloSingular.toLowerCase()}`
        }
        descricao={`Cadastro da tabela de domínio de ${rotuloPlural.toLowerCase()}.`}
        aoFechar={() => setDialogoAberto(false)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setDialogoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {erroFormulario && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{erroFormulario}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor={`nome-${tabela}`}>Nome *</Label>
              <Input
                id={`nome-${tabela}`}
                className="mt-1"
                value={formulario.nome}
                onChange={(evento) => alterar("nome", evento.target.value)}
                placeholder={`Nome do ${rotuloSingular.toLowerCase()}`}
              />
            </div>
            <div>
              <Label htmlFor={`sigla-${tabela}`}>Sigla</Label>
              <Input
                id={`sigla-${tabela}`}
                className="mt-1"
                value={formulario.sigla}
                onChange={(evento) => alterar("sigla", evento.target.value)}
                placeholder="Ex.: DEP-01"
              />
            </div>
            <div>
              <Label htmlFor={`ativo-${tabela}`}>Situação</Label>
              <Select
                id={`ativo-${tabela}`}
                className="mt-1"
                value={formulario.ativo}
                onChange={(evento) => alterar("ativo", evento.target.value)}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`descricao-${tabela}`}>Descrição</Label>
              <Input
                id={`descricao-${tabela}`}
                className="mt-1"
                value={formulario.descricao}
                onChange={(evento) => alterar("descricao", evento.target.value)}
                placeholder="Observação interna"
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        aberto={Boolean(excluindo)}
        titulo="Excluir registro"
        descricao={
          excluindo
            ? `O registro "${excluindo.nome}" será removido permanentemente.`
            : ""
        }
        aoFechar={() => setExcluindo(null)}
        largura="max-w-md"
        rodape={
          <>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void confirmarExclusao()}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Esta ação não pode ser desfeita. Confirme para prosseguir.
        </p>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Vínculo de usuários aos departamentos                                       */
/* -------------------------------------------------------------------------- */

interface PropsVinculoUsuarios {
  usuarios: UsuarioVinculado[];
  aoAtualizar: (usuarioId: string, departamentoId: string | null) => Promise<void>;
}

function VinculoUsuarios({ usuarios, aoAtualizar }: PropsVinculoUsuarios) {
  const { toast } = useToast();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const { data } = await supabase
        .from("departamentos")
        .select("id, nome, sigla, descricao, ativo")
        .order("nome", { ascending: true });
      if (!ativo) return;
      setDepartamentos((data as Departamento[]) ?? []);
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const nomeDoDepartamento = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return departamentos.find((departamento) => departamento.id === id)?.nome ?? null;
    },
    [departamentos],
  );

  const filtrados = useMemo(
    () =>
      usuarios.filter((usuario) => {
        if (filtro === "sem" && usuario.departamento_id) return false;
        if (filtro !== "todos" && filtro !== "sem" && usuario.departamento_id !== filtro) {
          return false;
        }
        return contemTexto(busca, [usuario.nome, usuario.matricula, usuario.cargo, usuario.setor]);
      }),
    [usuarios, busca, filtro],
  );

  const semDepartamento = usuarios.filter((usuario) => !usuario.departamento_id).length;
  const inativos = usuarios.filter((usuario) => !usuario.ativo).length;

  async function vincular(usuario: UsuarioVinculado, departamentoId: string) {
    setSalvandoId(usuario.id);
    const resultado = await aoAtualizar(
      usuario.id,
      departamentoId === "" ? null : departamentoId,
    );
    setSalvandoId(null);
    if (resultado) {
      toast(resultado, "erro");
      return;
    }
    toast(
      departamentoId === ""
        ? `Vínculo de ${usuario.nome} removido.`
        : `${usuario.nome} vinculado(a) ao departamento.`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Usuários por departamento</h2>
            <p className="text-sm text-muted-foreground">
              Selecione o departamento de cada usuário do sistema.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuários</p>
            <p className="mt-1 text-2xl font-semibold">{usuarios.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Sem departamento
            </p>
            <p className="mt-1 text-2xl font-semibold">{semDepartamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inativos</p>
            <p className="mt-1 text-2xl font-semibold">{inativos}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="busca-usuario">Buscar usuário</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca-usuario"
                  className="pl-9"
                  placeholder="Nome, matrícula, cargo ou setor…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-departamento">Departamento</Label>
              <Select
                id="filtro-departamento"
                className="mt-1"
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
              >
                <option value="todos">Todos os departamentos</option>
                <option value="sem">Sem departamento</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {filtrados.length === 0 ? (
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado com os filtros selecionados.
          </CardContent>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((usuario) => (
                <tr key={usuario.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{usuario.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[usuario.matricula, usuario.cargo, usuario.setor]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.ativo ? "success" : "muted"}>
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        className="min-w-[220px]"
                        value={usuario.departamento_id ?? ""}
                        disabled={salvandoId === usuario.id}
                        onChange={(evento) => void vincular(usuario, evento.target.value)}
                        aria-label={`Departamento de ${usuario.nome}`}
                      >
                        <option value="">Sem departamento</option>
                        {departamentos.map((departamento) => (
                          <option key={departamento.id} value={departamento.id}>
                            {departamento.nome}
                          </option>
                        ))}
                      </Select>
                      {salvandoId === usuario.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {usuario.departamento_id && !nomeDoDepartamento(usuario.departamento_id) && (
                      <p className="mt-1 text-xs text-destructive">
                        Departamento não encontrado — reveja o vínculo.
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

type Aba = "departamentos" | "usuarios" | "unidades";

export default function CadastrosBasicos() {
  const { ehAdministrador } = useAuth();
  const { toast } = useToast();
  const [aba, setAba] = useState<Aba>("departamentos");
  const [usuarios, setUsuarios] = useState<UsuarioVinculado[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

  const carregarUsuarios = useCallback(async () => {
    setCarregandoUsuarios(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, matricula, cargo, setor, ativo, departamento_id")
      .order("nome", { ascending: true });
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
    } else {
      setUsuarios((data as UsuarioVinculado[]) ?? []);
    }
    setCarregandoUsuarios(false);
  }, [toast]);

  useEffect(() => {
    void carregarUsuarios();
  }, [carregarUsuarios]);

  const contagemPorDepartamento = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const usuario of usuarios) {
      if (!usuario.departamento_id) continue;
      contagem[usuario.departamento_id] = (contagem[usuario.departamento_id] ?? 0) + 1;
    }
    return contagem;
  }, [usuarios]);

  async function atualizarVinculo(
    usuarioId: string,
    departamentoId: string | null,
  ): Promise<string | null> {
    const { error } = await supabase
      .from("profiles")
      .update({ departamento_id: departamentoId })
      .eq("id", usuarioId);
    if (error) return traduzirErroSupabase(error.message);
    setUsuarios((atuais) =>
      atuais.map((usuario) =>
        usuario.id === usuarioId ? { ...usuario, departamento_id: departamentoId } : usuario,
      ),
    );
    return null;
  }

  const abas: { id: Aba; rotulo: string; icone: ReactNode }[] = [
    { id: "departamentos", rotulo: "Departamentos", icone: <Building2 className="h-4 w-4" /> },
    { id: "usuarios", rotulo: "Usuários", icone: <Users className="h-4 w-4" /> },
    { id: "unidades", rotulo: "Unidades de Medida", icone: <Ruler className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cadastros Básicos</h1>
          <p className="text-sm text-muted-foreground">
            Tabelas de domínio: departamentos, vínculo de usuários e unidades de medida.
          </p>
        </div>
      </div>

      {!ehAdministrador && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            A manutenção das tabelas de domínio é restrita ao perfil administrador. Você pode
            consultar os cadastros, mas as alterações exigem perfil de administrador.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border">
        {abas.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.icone}
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === "departamentos" && (
        <TabelaDominio
          tabela="departamentos"
          titulo="Departamentos"
          descricao="Órgãos/áreas internas que atendem às demandas de contratação."
          rotuloSingular="Departamento"
          rotuloPlural="Departamentos"
          icone={<Building2 className="h-5 w-5" />}
          mostrarContagem
          contagemPorItem={contagemPorDepartamento}
        />
      )}

      {aba === "usuarios" && (
        <>
          {carregandoUsuarios ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando usuários…
            </div>
          ) : (
            <VinculoUsuarios usuarios={usuarios} aoAtualizar={atualizarVinculo} />
          )}
        </>
      )}

      {aba === "unidades" && (
        <TabelaDominio
          tabela="unidades_medida"
          titulo="Unidades de Medida"
          descricao="Unidades utilizadas na descrição e na medição dos itens do PCA."
          rotuloSingular="Unidade de Medida"
          rotuloPlural="Unidades de Medida"
          icone={<Ruler className="h-5 w-5" />}
        />
      )}
    </div>
  );
}
