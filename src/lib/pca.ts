export type StatusCatalogo = "rascunho" | "publicado" | "cancelado";

export interface CatalogoPCA {
  id: string;
  id_pncp: string;
  exercicio: number;
  data_publicacao: string | null;
  status: StatusCatalogo | string;
  observacoes: string | null;
  valor_total: number | string | null;
  criado_por: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface ItemGeralPCA {
  id: string;
  catalogo_id: string;
  codigo: string;
  descricao: string;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface ItemEspecificoPCA {
  id: string;
  catalogo_id: string;
  item_geral_id: string;
  codigo: string;
  descricao: string;
  id_pncp: string | null;
  id_documento_demanda: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface ClassePCA {
  id: string;
  catalogo_id: string;
  item_especifico_id: string;
  codigo: string;
  descricao: string;
  valor: number | string | null;
  quantidade: number | string | null;
  unidade_medida: string | null;
  especificacao: string | null;
  justificativa: string | null;
  observacoes: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export const STATUS_CATALOGO: { valor: string; rotulo: string }[] = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "publicado", rotulo: "Publicado" },
  { valor: "cancelado", rotulo: "Cancelado" },
];

export function rotuloStatusCatalogo(status: string | null | undefined): string {
  return (
    STATUS_CATALOGO.find((item) => item.valor === status)?.rotulo ??
    "Rascunho"
  );
}

export function varianteStatusCatalogo(
  status: string | null | undefined,
): "success" | "warning" | "danger" | "outline" {
  if (status === "publicado") return "success";
  if (status === "cancelado") return "danger";
  if (status === "rascunho") return "warning";
  return "outline";
}

export function formatarMoedaPCA(valor: number | string | null | undefined): string {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarDataPCA(data: string | null | undefined): string {
  if (!data) return "—";
  const texto = String(data).slice(0, 10);
  const partes = texto.split("-");
  if (partes.length !== 3) return texto;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function formatarQuantidadePCA(
  valor: number | string | null | undefined,
): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export function exerciciosSugeridos(): number[] {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2];
}

/** Gera o próximo código sequencial do nível a partir dos já existentes. */
export function proximoCodigo(codigos: string[], nivel: 1 | 2 | 3): string {
  const numeros = codigos
    .map((codigo) => codigo.split("."))
    .filter((partes) => partes.length === nivel)
    .map((partes) => Number(partes[nivel - 1]))
    .filter((numero) => Number.isFinite(numero));
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  const partes = new Array(nivel).fill("00");
  partes[nivel - 1] = String(proximo).padStart(2, "0");
  return partes.join(".");
}
