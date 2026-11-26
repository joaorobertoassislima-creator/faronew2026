import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import ModalUsuario, { type FormularioUsuario } from "@/components/usuarios/ModalUsuario";
import ModalRedefinirSenha from "@/components/usuarios/ModalRedefinirSenha";
import { PAPEIS, type Papel, useAuth } from "@/lib/auth";
import {
  alterarStatusUsuario,
  atualizarUsuario,
  criarUsuario,
  listarDepartamentos,
  listarPermissoes,
  listarUsuarios,
  redefinirSenhaUsuario,
  DESCRICOES_PAPEIS,
  ROTULOS_COMANDO,
  ROTULOS_PAPEIS,
  type DepartamentoSimples,
  type PermissaoTabela,
  type UsuarioSistema,
} from "@/lib/usuarios";

type Aba = "usuarios" | "papeis";

function formatarData(valor: string | null): string {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Usuarios() {
  const { toast } = useToast();
  const { usuario: sessaoUsuario, ehAdministrador } = useAuth();

  const [aba, setAba] = useState<Aba>("usuarios");
  const [carregando, setCarregando] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoTabela[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartamentoSimples[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroPapel, setFiltroPapel] = useState<Papel | "todos">("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioSistema | null>(null);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [usuarioDaSenha, setUsuarioDaSenha] = useState<UsuarioSistema | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);

    // Cada consulta é tratada por conta própria: uma falha em permissões ou
    // departamentos não pode impedir a exibição da lista de usuários.
    const [resultadoUsuarios, resultadoPermissoes, resultadoDepartamentos] =
      await Promise.allSettled([
        listarUsuarios(),
        listarPermissoes(),
        listarDepartamentos(),
      ]);

    if (resultadoUsuarios.status === "fulfilled") {
      setUsuarios(resultadoUsuarios.value);
    } else {
      toast(
        resultadoUsuarios.reason instanceof Error
          ? resultadoUsuarios.reason.message
          : "Não foi possível carregar os usuários.",
        "erro",
      );
    }

    if (resultadoPermissoes.status === "fulfilled") {
      setPermissoes(resultadoPermissoes.value);
    } else {
      setPermissoes([]);
      toast(
        resultadoPermissoes.reason instanceof Error
          ? resultadoPermissoes.reason.message
          : "Não foi possível carregar as permissões.",
        "erro",
      );
    }

    if (resultadoDepartamentos.status === "fulfilled") {
      setDepartamentos(resultadoDepartamentos.value);
    } else {
      setDepartamentos([]);
      toast(
        resultadoDepartamentos.reason instanceof Error
          ? resultadoDepartamentos.reason.message
          : "Não foi possível carregar os departamentos.",
        "erro",
      );
    }

    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    if (!ehAdministrador) {
      setCarregando(false);
      return;
    }
    void carregar();
  }, [ehAdministrador, carregar]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((item) => {
      if (filtroPapel !== "todos" && !item.papeis.includes(filtroPapel)) return false;
      if (!termo) return true;
      return (
        item.nome.toLowerCase().includes(termo) ||
        item.email.toLowerCase().includes(termo) ||
        (item.matricula ?? "").toLowerCase().includes(termo) ||
        (item.departamento_nome ?? "").toLowerCase().includes(termo)
      );
    });
  }, [usuarios, busca, filtroPapel]);

  async function salvarUsuario(formulario: FormularioUsuario): Promise<string | null> {
    const papeis = formulario.papeis as Papel[];

    if (usuarioEmEdicao) {
      const problema = await atualizarUsuario(usuarioEmEdicao.id, {
        nome: formulario.nome,
        matricula: formulario.matricula || null,
        cargo: formulario.cargo || null,
        setor: formulario.setor || null,
        telefone: formulario.telefone || null,
        ativo: usuarioEmEdicao.ativo,
        departamento_id: formulario.departamento_id || null,
        papeis,
      });
      if (problema) return problema;

      if (formulario.senha) {
        const problemaSenha = await redefinirSenhaUsuario(
          usuarioEmEdicao.id,
          formulario.senha,
        );
        if (problemaSenha) return problemaSenha;
      }

      toast("Usuário atualizado com sucesso.");
      setModalAberto(false);
      setUsuarioEmEdicao(null);
      await carregar();
      return null;
    }

    const problema = await criarUsuario({
      nome: formulario.nome,
      email: formulario.email,
      senha: formulario.senha,
      matricula: formulario.matricula || null,
      cargo: formulario.cargo || null,
      setor: formulario.setor || null,
      telefone: formulario.telefone || null,
      departamento_id: formulario.departamento_id || null,
      papeis,
    });
    if (problema) return problema;

    toast("Usuário criado com sucesso.");
    setModalAberto(false);
    await carregar();
    return null;
  }

  async function alternarStatus(alvo: UsuarioSistema) {
    const problema = await alterarStatusUsuario(alvo.id, !alvo.ativo);
    if (problema) {
      toast(problema, "erro");
      return;
    }
    toast(alvo.ativo ? "Acesso desativado." : "Acesso reativado.");
    await carregar();
  }

  async function redefinirSenha(senha: string) {
    if (!usuarioDaSenha) return;
    const problema = await redefinirSenhaUsuario(usuarioDaSenha.id, senha);
    if (problema) {
      toast(problema, "erro");
      throw new Error(problema);
    }
    toast("Senha redefinida com sucesso.");
    setModalSenhaAberto(false);
    setUsuarioDaSenha(null);
  }

  if (!ehAdministrador) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground">
              Somente administradores podem gerenciar usuários e permissões.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários e Permissões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os acessos ao SisPatri, os papéis de cada servidor e as permissões
            aplicadas no banco de dados.
          </p>
        </div>
        <Button
          onClick={() => {
            setUsuarioEmEdicao(null);
            setModalAberto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setAba("usuarios")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            aba === "usuarios"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Usuários
        </button>
        <button
          type="button"
          onClick={() => setAba("papeis")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            aba === "papeis"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Papéis e permissões
        </button>
      </div>

      {aba === "usuarios" ? (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder="Buscar por nome, e-mail, matrícula ou departamento"
                  className="pl-9"
                />
              </div>
              <Select
                value={filtroPapel}
                onChange={(evento) => setFiltroPapel(evento.target.value as Papel | "todos")}
              >
                <option value="todos">Todos os papéis</option>
                {PAPEIS.map((papel) => (
                  <option key={papel} value={papel}>
                    {ROTULOS_PAPEIS[papel]}
                  </option>
                ))}
              </Select>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado com os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Usuário</th>
                      <th className="px-3 py-2 font-medium">Matrícula</th>
                      <th className="px-3 py-2 font-medium">Departamento</th>
                      <th className="px-3 py-2 font-medium">Papéis</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((item) => (
                      <tr key={item.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-xs text-muted-foreground">{item.email}</div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {item.matricula || "-"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {item.departamento_nome || "-"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.papeis.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem papel</span>
                            ) : (
                              item.papeis.map((papel) => (
                                <Badge key={papel} variant="outline">
                                  {ROTULOS_PAPEIS[papel]}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={item.ativo ? "success" : "muted"}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar usuário"
                              onClick={() => {
                                setUsuarioEmEdicao(item);
                                setModalAberto(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Redefinir senha"
                              onClick={() => {
                                setUsuarioDaSenha(item);
                                setModalSenhaAberto(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={item.ativo ? "Desativar acesso" : "Reativar acesso"}
                              disabled={item.id === sessaoUsuario?.id}
                              onClick={() => alternarStatus(item)}
                            >
                              {item.ativo ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {usuariosFiltrados.length} de {usuarios.length} usuário(s) exibido(s).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAPEIS.map((papel) => (
              <Card key={papel}>
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{ROTULOS_PAPEIS[papel]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{DESCRICOES_PAPEIS[papel]}</p>
                  <p className="pt-1 text-xs text-muted-foreground">
                    {usuarios.filter((item) => item.papeis.includes(papel)).length} usuário(s)
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <h2 className="text-base font-semibold">Permissões por tabela</h2>
                <p className="text-sm text-muted-foreground">
                  Regras ativas no banco de dados, por tabela e tipo de operação.
                </p>
              </div>

              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando permissões...
                </div>
              ) : permissoes.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma permissão encontrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Tabela</th>
                        <th className="px-3 py-2 font-medium">Operação</th>
                        <th className="px-3 py-2 font-medium">Papéis com acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissoes.map((permissao) => (
                        <tr
                          key={`${permissao.tabela}-${permissao.comando}`}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">{permissao.tabela}</td>
                          <td className="px-3 py-2">
                            <Badge variant="muted">
                              {ROTULOS_COMANDO[permissao.comando] ?? permissao.comando}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {permissao.papeis.map((papel) => (
                                <Badge key={papel} variant="outline">
                                  {ROTULOS_PAPEIS[papel as Papel] ?? papel}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ModalUsuario
        aberto={modalAberto}
        aoFechar={() => {
          setModalAberto(false);
          setUsuarioEmEdicao(null);
        }}
        aoSalvar={salvarUsuario}
        usuario={usuarioEmEdicao}
        departamentos={departamentos}
      />

      <ModalRedefinirSenha
        aberto={modalSenhaAberto}
        aoFechar={() => {
          setModalSenhaAberto(false);
          setUsuarioDaSenha(null);
        }}
        aoConfirmar={redefinirSenha}
        nomeUsuario={usuarioDaSenha?.nome ?? ""}
      />
    </div>
  );
}
