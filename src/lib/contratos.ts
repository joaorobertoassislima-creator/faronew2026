/** Tipos e regras do módulo de Contratos. */

export const STATUS_CONTRATO = [
  { valor: "planejado", rotulo: "Planejado" },
  { valor: "vigente", rotulo: "Vigente" },
  { valor: "suspenso", rotulo: "Suspenso" },
  { valor: "encerrado", rotulo: "Encerrado" },
  { valor: "rescindido", rotulo: "Rescindido" },
] as const;

export type StatusContrato = (typeof STATUS_CONTRATO)[number]["valor"];

export const MODALIDADES = [
  "Pregão Eletrônico",
  "Pregão Presencial",
  "Dispensa de Licitação",
  "Inexigibilidade",
  "Concorrência",
  "Tomada de Preços",
  "Leilão",
  "Contrato direto",
] as const;

export interface Contrato {
  id: string;
  numero: string;
  objeto: string;
  fornecedor: string;
  cnpj: string | null;
  modalidade: string;
  processo: string | null;
  valor: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: StatusContrato;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function rotuloStatus(status: string): string {
  return STATUS_CONTRATO.find((item) => item.valor === status)?.rotulo ?? status;
}

export type VarianteStatus = "success" | "warning" | "danger" | "muted" | "default";

export function varianteStatus(status: string): VarianteStatus {
  switch (status) {
    case "vigente":
      return "success";
    case "planejado":
      return "default";
    case "suspenso":
      return "warning";
    case "encerrado":
      return "muted";
    case "rescindido":
      return "danger";
    default:
      return "muted";
  }
}

/** Dias restantes até o fim da vigência (negativo quando já venceu). */
export function diasParaVencer(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const fim = new Date(`${dataFim}T00:00:00`);
  if (Number.isNaN(fim.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((fim.getTime() - hoje.getTime()) / 86400000);
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function moedaParaNumero(valor: string): number {
  const limpo = valor.trim().replace(/[R$\s]/g, "");
  if (!limpo) return 0;
  if (limpo.includes(",")) {
    const normalizado = limpo.replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  }
  const numero = Number(limpo);
  return Number.isNaN(numero) ? 0 : numero;
}
