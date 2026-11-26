import { supabase } from "@/lib/supabase";
import { PAPEIS, type Papel } from "@/lib/auth";

/**
 * Camada de dados da tela de Usuários e Permissões.
 *
 * A listagem e a alteração de usuários passam por funções do banco
 * (`listar_usuarios` / `atualizar_usuario` / `listar_permissoes`), que já
 * validam se quem chama é administrador. A criação de contas e a redefinição
 * de senha exigem a API administrativa do Auth e, por isso, ficam na Edge
 * Function "gerenciar-usuarios".
 *
 * As funções de escrita devolvem `null` quando tudo corre bem e a mensagem de
 * erro quando algo falha, para que a tela possa exibir o problema dentro do
 * modal sem try/catch espalhado.
 */

export interface UsuarioSistema {
  id: string;
  email: string;
  nome: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  telefone: string | null;
  ativo: boolean;
  departamento_id: string | null;
  departamento_nome: string | null;
  criado_em: string;
  papeis: Papel[];
}

export interface PermissaoTabela {
  tabela: string;
  comando: string;
  papeis: string[];
}

export interface DepartamentoSimples {
  id: string;
  nome: string;
}

/** Aliases de tipo para manter a nomenclatura usada nas telas. */
export type Usuario = UsuarioSistema;
export type Permissao = PermissaoTabela;
export type Departamento = DepartamentoSimples;

export const ROTULOS_PAPEIS: Record<Papel, string> = {
  administrador: "Administrador",
  agente_compras: "Agente de Compras",
  almoxarife: "Almoxarife",
  gestor_aprovador: "Gestor Aprovador",
  servidor: "Servidor",
  auditor: "Auditor",
};

export const DESCRICOES_PAPEIS: Record<Papel, string> = {
  administrador: "Acesso total ao sistema, incluindo usuários e permissões.",
  agente_compras: "Contratos, fornecedores, PCA e catálogo de produtos.",
  almoxarife: "Estoque, entradas de produtos e atendimento de requisições.",
  gestor_aprovador: "Análise e aprovação das requisições de materiais.",
  servidor: "Abertura e acompanhamento das próprias requisições.",
  auditor: "Consulta aos registros do sistema, sem alterar dados.",
};

export const ROTULOS_COMANDO: Record<string, string> = {
  select: "Leitura",
  insert: "Criação",
  update: "Edição",
  delete: "Exclusão",
};

/** Lista de papéis disponível para seleção na tela. */
export const PAPEIS_DISPONIVEIS = PAPEIS;

export interface DadosUsuario {
  id?: string;
  nome?: string;
  email?: string;
  matricula?: string | null;
  cargo?: string | null;
  setor?: string | null;
  telefone?: string | null;
  departamento_id?: string | null;
  ativo?: boolean;
  papeis?: Papel[] | string[];
  senha?: string;
}

/** Extrai uma mensagem legível de erros do Supabase. */
function mensagemDeErro(erro: unknown): string {
  if (!erro) return "Erro inesperado.";
  if (typeof erro === "string") return erro;
  if (erro instanceof Error) return erro.message;
  const objeto = erro as { message?: string; error_description?: string };
  return objeto.message ?? objeto.error_description ?? "Erro inesperado.";
}

/** Normaliza uma lista de papéis recebida do formulário. */
function normalizarPapeis(papeis: unknown): Papel[] {
  if (!Array.isArray(papeis)) return [];
  return papeis.filter((papel): papel is Papel =>
    (PAPEIS as readonly string[]).includes(String(papel)),
  );
}

/** Lista todos os usuários cadastrados (somente administradores). */
export async function listarUsuarios(): Promise<UsuarioSistema[]> {
  const { data, error } = await supabase.rpc("listar_usuarios");
  if (error) throw new Error(mensagemDeErro(error));

  return ((data ?? []) as UsuarioSistema[]).map((item) => ({
    ...item,
    papeis: normalizarPapeis(item.papeis),
  }));
}

/** Lista as permissões efetivas (tabela x comando x papéis) do banco. */
export async function listarPermissoes(): Promise<PermissaoTabela[]> {
  const { data, error } = await supabase.rpc("listar_permissoes");
  if (error) throw new Error(mensagemDeErro(error));
  return (data ?? []) as PermissaoTabela[];
}

/** Lista os departamentos para preencher o campo de vínculo do usuário. */
export async function listarDepartamentos(): Promise<DepartamentoSimples[]> {
  const { data, error } = await supabase
    .from("departamentos")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error) throw new Error(mensagemDeErro(error));
  return (data ?? []) as DepartamentoSimples[];
}

/** Alias usado em alguns formulários. */
export const listarDepartamentosSimples = listarDepartamentos;

/**
 * Cria uma conta de usuário. Vai para a Edge Function "gerenciar-usuarios",
 * que usa a API administrativa do Auth (a senha nunca trafega para o navegador).
 *
 * Devolve `null` em caso de sucesso ou a mensagem de erro.
 */
export async function criarUsuario(dados: DadosUsuario): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("gerenciar-usuarios", {
    body: {
      acao: "criar",
      nome: dados.nome ?? "",
      email: dados.email ?? "",
      senha: dados.senha ?? "",
      matricula: dados.matricula ?? "",
      cargo: dados.cargo ?? "",
      setor: dados.setor ?? "",
      telefone: dados.telefone ?? "",
      departamento_id: dados.departamento_id ?? null,
      ativo: dados.ativo !== false,
      papeis: normalizarPapeis(dados.papeis),
    },
  });

  if (error) return mensagemDeErro(error);
  const retorno = (data ?? {}) as { id?: string; mensagem?: string; erro?: string };
  if (retorno.erro) return retorno.erro;
  return null;
}

/**
 * Redefine a senha de um usuário existente.
 *
 * Devolve `null` em caso de sucesso ou a mensagem de erro.
 */
export async function redefinirSenhaUsuario(
  userId: string,
  senha: string,
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("gerenciar-usuarios", {
    body: { acao: "redefinir-senha", user_id: userId, senha },
  });

  if (error) return mensagemDeErro(error);
  const retorno = (data ?? {}) as { mensagem?: string; erro?: string };
  if (retorno.erro) return retorno.erro;
  return null;
}

/** Alias de {@link redefinirSenhaUsuario}. */
export const redefinirSenha = redefinirSenhaUsuario;

/**
 * Salva as alterações de perfil, vínculo e papéis de um usuário.
 *
 * Devolve `null` em caso de sucesso ou a mensagem de erro.
 */
export async function atualizarUsuario(
  userId: string,
  dados: DadosUsuario,
): Promise<string | null> {
  const { error } = await supabase.rpc("atualizar_usuario", {
    p_user_id: userId,
    p_nome: dados.nome ?? "",
    p_matricula: dados.matricula ?? "",
    p_cargo: dados.cargo ?? "",
    p_setor: dados.setor ?? "",
    p_telefone: dados.telefone ?? "",
    p_ativo: dados.ativo ?? null,
    p_departamento_id: dados.departamento_id ?? null,
    p_papeis: normalizarPapeis(dados.papeis),
    p_remover_departamento: !dados.departamento_id,
  });

  if (error) return mensagemDeErro(error);
  return null;
}

/**
 * Ativa ou desativa o acesso de um usuário, sem alterar os demais dados.
 *
 * Devolve `null` em caso de sucesso ou a mensagem de erro.
 */
export async function alterarStatusUsuario(
  userId: string,
  ativo: boolean,
): Promise<string | null> {
  const { error } = await supabase.rpc("atualizar_usuario", {
    p_user_id: userId,
    p_ativo: ativo,
  });

  if (error) return mensagemDeErro(error);
  return null;
}

/** Alias de {@link alterarStatusUsuario}. */
export const atualizarStatusUsuario = alterarStatusUsuario;
/** Alias de {@link alterarStatusUsuario}. */
export const alternarStatusUsuario = alterarStatusUsuario;
