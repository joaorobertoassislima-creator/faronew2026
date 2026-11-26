/**
 * Cadastros Básicos (Tabelas de Domínio).
 *
 * Departamentos, vínculo de usuários aos departamentos e unidades de medida.
 */

export interface Departamento {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  ativo: boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface UnidadeMedida {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  ativo: boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface UsuarioVinculado {
  id: string;
  nome: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  ativo: boolean;
  departamento_id: string | null;
}

/** Normaliza texto para comparação sem acentos e espaços extras. */
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Verifica se o texto informado está contido em algum dos campos. */
export function contemTexto(termo: string, campos: (string | null | undefined)[]): boolean {
  const alvo = normalizarTexto(termo);
  if (!alvo) return true;
  return campos.some((campo) => normalizarTexto(campo).includes(alvo));
}
