/** Formata uma data no padrão brasileiro: dd/mm/aaaa */
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata uma data que vem do banco no formato "aaaa-mm-dd" (sem fuso horário).
 * Evita o deslocamento de um dia que ocorre ao converter para Date (UTC).
 */
export function formatarDataISO(valor: string | null | undefined): string {
  if (!valor) return "—";
  const partes = valor.slice(0, 10).split("-");
  if (partes.length !== 3) return "—";
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** Formata data e hora no padrão brasileiro: dd/mm/aaaa às HH:mm */
export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return `${formatarData(data)} às ${data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Formata valores monetários em Real: R$ 1.234,56 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte "aaaa-mm-dd" em "dd/mm/aaaa" (para exibir e editar) */
export function isoParaDataBr(valor: string | null | undefined): string {
  if (!valor) return "";
  const partes = valor.slice(0, 10).split("-");
  if (partes.length !== 3) return "";
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd" (para envio ao banco) */
export function dataParaIso(valor: string): string | null {
  const partes = valor.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}
