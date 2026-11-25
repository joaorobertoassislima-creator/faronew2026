/** Tipos e regras do módulo de Fornecedores. */

export const STATUS_FORNECEDOR = [
  { valor: "ativo", rotulo: "Ativo" },
  { valor: "inativo", rotulo: "Inativo" },
  { valor: "suspenso", rotulo: "Suspenso" },
] as const;

export type StatusFornecedor = (typeof STATUS_FORNECEDOR)[number]["valor"];

export const TIPOS_PESSOA = [
  { valor: "pj", rotulo: "Pessoa Jurídica" },
  { valor: "pf", rotulo: "Pessoa Física" },
] as const;

export const NATUREZAS_SOCIAIS = [
  "Sociedade Anônima",
  "Sociedade Limitada",
  "Sociedade em Nome Coletivo",
  "Sociedade Simples",
  "Empresário Individual",
  "Microempresa",
  "Cooperativa",
  "Consórcio",
  "Pessoa Física",
  "Outro",
] as const;

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  natureza_social: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  responsavel_telefone: string | null;
  responsavel_email: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_pessoa: "pj" | "pf";
  status: StatusFornecedor;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function rotuloStatusFornecedor(status: string): string {
  return STATUS_FORNECEDOR.find((item) => item.valor === status)?.rotulo ?? status;
}

export function varianteStatusFornecedor(status: string): "success" | "warning" | "muted" {
  switch (status) {
    case "ativo":
      return "success";
    case "suspenso":
      return "warning";
    default:
      return "muted";
  }
}

/** Normaliza CNPJ/CPF para comparar sem pontuação. */
export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Formata CNPJ/CPF com máscara: 00.000.000/0000-00 ou 000.000.000-00. */
export function formatarDocumento(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return valor ?? "—";
}

/** Aplica a máscara de CNPJ enquanto o usuário digita (aceita valores parciais). */
export function mascaraDocumento(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14);
  const p1 = digitos.slice(0, 2);
  const p2 = digitos.slice(2, 5);
  const p3 = digitos.slice(5, 8);
  const p4 = digitos.slice(8, 12);
  const p5 = digitos.slice(12, 14);
  let resultado = p1;
  if (p2) resultado += `.${p2}`;
  if (p3) resultado += `.${p3}`;
  if (p4) resultado += `/${p4}`;
  if (p5) resultado += `-${p5}`;
  return resultado;
}

/** Aplica a máscara de CEP enquanto o usuário digita. */
export function mascaraCep(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/** Formata CEP: 00000-000. */
export function formatarCep(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 8) return valor ?? "—";
  return digitos.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/** Endereço em uma linha, para exibição resumida. */
export function enderecoCompleto(fornecedor: Pick<Fornecedor, "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf">): string {
  const partes = [
    [fornecedor.logradouro, fornecedor.numero].filter(Boolean).join(", "),
    fornecedor.complemento,
    fornecedor.bairro,
    [fornecedor.cidade, fornecedor.uf].filter(Boolean).join(" - "),
  ].filter((parte) => parte && String(parte).trim().length > 0);
  return partes.length > 0 ? partes.join(" · ") : "—";
}
