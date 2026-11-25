import { supabase } from "@/lib/supabase";

export interface ColunaImportacao {
  chave: string;
  rotulo: string;
  obrigatoria: boolean;
  descricao: string;
}

/** Colunas aceitas no CSV de importação (modelo basedo no PNCP). */
export const COLUNAS_IMPORTACAO: ColunaImportacao[] = [
  { chave: "codigo_geral", rotulo: "codigo_geral", obrigatoria: true, descricao: "Código do item geral (ex.: 1.00.00)" },
  { chave: "descricao_geral", rotulo: "descricao_geral", obrigatoria: true, descricao: "Descrição do item geral (ex.: MATERIAL)" },
  { chave: "codigo_especifico", rotulo: "codigo_especifico", obrigatoria: true, descricao: "Código do item específico (ex.: 1.01.00)" },
  { chave: "descricao_especifico", rotulo: "descricao_especifico", obrigatoria: true, descricao: "Descrição do item específico" },
  { chave: "id_pncp", rotulo: "id_pncp", obrigatoria: false, descricao: "ID do item no PNCP (opcional)" },
  { chave: "id_doc_demanda", rotulo: "id_doc_demanda", obrigatoria: false, descricao: "ID do documento de demanda (opcional)" },
  { chave: "codigo_classe", rotulo: "codigo_classe", obrigatoria: true, descricao: "Código da classe/grupo (ex.: 1.01.01)" },
  { chave: "descricao_classe", rotulo: "descricao_classe", obrigatoria: true, descricao: "Descrição da classe/grupo" },
  { chave: "valor", rotulo: "valor", obrigatoria: true, descricao: "Valor em reais (aceita 1.500,00 ou 1500.00)" },
  { chave: "quantidade", rotulo: "quantidade", obrigatoria: false, descricao: "Quantidade (opcional)" },
  { chave: "unidade", rotulo: "unidade", obrigatoria: false, descricao: "Unidade de medida (opcional)" },
  { chave: "especificacao", rotulo: "especificacao", obrigatoria: false, descricao: "Especificação técnica (opcional)" },
  { chave: "justificativa", rotulo: "justificativa", obrigatoria: false, descricao: "Justificativa (opcional)" },
  { chave: "observacoes", rotulo: "observacoes", obrigatoria: false, descricao: "Observações (opcional)" },
];

export interface LinhaImportada {
  linha: number;
  codigoGeral: string;
  descricaoGeral: string;
  codigoEspecifico: string;
  descricaoEspecifico: string;
  idPncp: string;
  idDocumentoDemanda: string;
  codigoClasse: string;
  descricaoClasse: string;
  valor: number;
  quantidade: number | null;
  unidade: string;
  especificacao: string;
  justificativa: string;
  observacoes: string;
}

export interface AnaliseArquivo {
  cabecalhos: string[];
  separador: string;
  linhas: LinhaImportada[];
  ignoradas: string[];
  colunasFaltando: string[];
  totalLinhas: number;
}

export interface ResultadoImportacao {
  processadas: number;
  ignoradas: number;
  itensGerais: number;
  itensEspecificos: number;
  classes: number;
  avisos: string[];
  erros: string[];
}

/** Remove espaços extras e normaliza quebras de linha das descrições. */
function normalizarTexto(valor: string): string {
  return valor.replace(/\s+/g, " ").trim();
}

/** Campos optreativos que chegam como "0" são tratados como vazios. */
function limparOpcional(valor: string): string {
  const texto = normalizarTexto(valor);
  return texto === "0" ? "" : texto;
}

/** Converte valores monetários aceitando vírgula ou ponto decimal. */
export function converterNumero(valor: string): number | null {
  const limpo = valor.replace(/[R$\s]/g, "").trim();
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  }
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/** Divide o conteúdo do CSV respeitando aspas e o separador informado. */
export function parsearCsv(texto: string, separador: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (dentroDeAspas) {
      if (caractere === '"') {
        if (texto[indice + 1] === '"') {
          campo += '"';
          indice += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += caractere;
      }
      continue;
    }
    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === separador) {
      linha.push(campo);
      campo = "";
    } else if (caractere === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (caractere !== "\r") {
      campo += caractere;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/** Descodifica o arquivo aceitando UTF-8 (com ou sem BOM) e Latin-1. */
export function decodificarArquivo(conteudo: ArrayBuffer): string {
  let texto = new TextDecoder("utf-8").decode(conteudo);
  if (/[ÃÂ]/.test(texto)) {
    try {
      const alternativa = new TextDecoder("windows-1252").decode(conteudo);
      if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(alternativa)) {
        texto = alternativa;
      }
    } catch {
      // mantém o conteúdo original
    }
  }
  return texto.replace(/^\uFEFF/, "");
}

/** Detecta o separador do CSV a partir da linha de cabeçalho. */
export function detectarSeparador(cabecalho: string): string {
  return cabecalho.includes(";") ? ";" : ",";
}

/** Valida e converte o conteúdo do CSV em linhas prontas para importação. */
export function analisarArquivoPCA(texto: string): AnaliseArquivo {
  const limpo = texto.replace(/^\uFEFF/, "");
  const primeiraLinha = limpo.split(/\r?\n/)[0] ?? "";
  const separador = detectarSeparador(primeiraLinha);
  const todas = parsearCsv(limpo, separador);
  const cabecalhos = (todas[0] ?? []).map((coluna) => coluna.trim().toLowerCase());

  const colunasFaltando = COLUNAS_IMPORTACAO.filter(
    (coluna) => coluna.obrigatoria && !cabecalhos.includes(coluna.chave),
  ).map((coluna) => coluna.chave);

  const indices = new Map(cabecalhos.map((cabecalho, indice) => [cabecalho, indice]));
  const linhas: LinhaImportada[] = [];
  const ignoradas: string[] = [];

  const corpo = todas.slice(1);

  corpo.forEach((colunas, posicao) => {
    const numeroLinha = posicao + 2;
    if (colunas.every((coluna) => !coluna.trim())) return;

    const valor = (chave: string) => {
      const indice = indices.get(chave);
      return indice === undefined ? "" : (colunas[indice] ?? "");
    };

    const codigoGeral = normalizarTexto(valor("codigo_geral"));
    const descricaoGeral = normalizarTexto(valor("descricao_geral"));
    const codigoEspecifico = normalizarTexto(valor("codigo_especifico"));
    const descricaoEspecifico = normalizarTexto(valor("descricao_especifico"));
    const codigoClasse = normalizarTexto(valor("codigo_classe"));
    const descricaoClasse = normalizarTexto(valor("descricao_classe"));

    const obrigatoriosVazios: string[] = [];
    if (!codigoGeral) obrigatoriosVazios.push("codigo_geral");
    if (!descricaoGeral) obrigatoriosVazios.push("descricao_geral");
    if (!codigoEspecifico) obrigatoriosVazios.push("codigo_especifico");
    if (!descricaoEspecifico) obrigatoriosVazios.push("descricao_especifico");
    if (!codigoClasse) obrigatoriosVazios.push("codigo_classe");
    if (!descricaoClasse) obrigatoriosVazios.push("descricao_classe");

    const numeroValor = converterNumero(valor("valor"));
    if (numeroValor === null) obrigatoriosVazios.push("valor");

    if (obrigatoriosVazios.length > 0) {
      ignoradas.push(
        `Linha ${numeroLinha}: campos obrigatórios vazios ou inválidos (${obrigatoriosVazios.join(", ")}) - linha ignorada`,
      );
      return;
    }

    const quantidadeTexto = valor("quantidade").trim();
    const quantidade = quantidadeTexto ? converterNumero(quantidadeTexto) : null;

    linhas.push({
      linha: numeroLinha,
      codigoGeral,
      descricaoGeral,
      codigoEspecifico,
      descricaoEspecifico,
      idPncp: limparOpcional(valor("id_pncp")),
      idDocumentoDemanda: limparOpcional(valor("id_doc_demanda")),
      codigoClasse,
      descricaoClasse,
      valor: numeroValor ?? 0,
      quantidade,
      unidade: limparOpcional(valor("unidade")),
      especificacao: limparOpcional(valor("especificacao")),
      justificativa: limparOpcional(valor("justificativa")),
      observacoes: limparOpcional(valor("observacoes")),
    });
  });

  return {
    cabecalhos,
    separador,
    linhas,
    ignoradas,
    colunasFaltando,
    totalLinhas: corpo.length,
  };
}

/** Gera o conteúdo do modelo CSV de importação. */
export function gerarModeloCsv(catalogoIdPncp: string): string {
  const cabecalhos = COLUNAS_IMPORTACAO.map((coluna) => coluna.chave).join(";");
  const exemplos = [
    [
      "1.00.00",
      "MATERIAL",
      "1.01.00",
      "MATERIAL DE LIMPEZA",
      "123456",
      "DMD-2025-001",
      "1.01.01",
      "PRODUTOS DE LIMPEZA",
      "2500,00",
      "100",
      "UN",
      "Detergente neutro 500ml",
      "Reposição anual do estoque de limpeza",
      "Catálogo " + catalogoIdPncp,
    ],
    [
      "1.00.00",
      "MATERIAL",
      "1.01.00",
      "MATERIAL DE LIMPEZA",
      "123456",
      "DMD-2025-001",
      "1.01.02",
      "PRODUTOS DESCARTÁVEIS",
      "1400,00",
      "50",
      "CX",
      "Papel toalha interfolhado",
      "Atendimento aos setores administrativos",
      "",
    ],
    [
      "1.00.00",
      "MATERIAL",
      "1.02.00",
      "MATERIAL DE ESCRITÓRIO",
      "123457",
      "DMD-2025-002",
      "1.02.01",
      "SUPRIMENTOS",
      "29100,00",
      "200",
      "UN",
      "Caneta esferográfica azul",
      "Reposição de material de escritório",
      "",
    ],
  ];
  return [cabecalhos, ...exemplos.map((linha) => linha.join(";"))].join("\n");
}

/**
 * Grava os itens do CSV no catálogo, criando ou atualizando pelo par
 * (catálogo, código) em cada um dos três níveis da hierarquia.
 */
export async function processarImportacaoPCA(
  catalogoId: string,
  linhas: LinhaImportada[],
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = {
    processadas: 0,
    ignoradas: 0,
    itensGerais: 0,
    itensEspecificos: 0,
    classes: 0,
    avisos: [],
    erros: [],
  };

  if (linhas.length === 0) {
    resultado.erros.push("Nenhuma linha válida para importar.");
    return resultado;
  }

  const agora = new Date().toISOString();

  const gerais = new Map<string, string>();
  for (const linha of linhas) {
    gerais.set(linha.codigoGeral, linha.descricaoGeral);
  }
  const especificos = new Map<string, { descricao: string; idPncp: string; idDemanda: string; codigoGeral: string }>();
  for (const linha of linhas) {
    especificos.set(linha.codigoEspecifico, {
      descricao: linha.descricaoEspecifico,
      idPncp: linha.idPncp,
      idDemanda: linha.idDocumentoDemanda,
      codigoGeral: linha.codigoGeral,
    });
  }
  const classes = new Map<string, LinhaImportada>();
  for (const linha of linhas) {
    classes.set(linha.codigoClasse, linha);
  }

  try {
    const payloadGerais = [...gerais.entries()].map(([codigo, descricao]) => ({
      catalogo_id: catalogoId,
      codigo,
      descricao,
      atualizado_em: agora,
    }));
    const { data: dadosGerais, error: erroGerais } = await supabase
      .from("pca_itens_gerais")
      .upsert(payloadGerais, { onConflict: "catalogo_id,codigo" })
      .select("id,codigo");
    if (erroGerais) throw erroGerais;
    const mapaGerais = new Map<string, string>();
    for (const item of dadosGerais ?? []) {
      mapaGerais.set(String(item.codigo), String(item.id));
    }
    resultado.itensGerais = payloadGerais.length;

    const payloadEspecificos = [...especificos.entries()].map(([codigo, item]) => ({
      catalogo_id: catalogoId,
      item_geral_id: mapaGerais.get(item.codigoGeral) ?? null,
      codigo,
      descricao: item.descricao,
      id_pncp: item.idPncp || null,
      id_documento_demanda: item.idDemanda || null,
      atualizado_em: agora,
    }));
    const { data: dadosEspecificos, error: erroEspecificos } = await supabase
      .from("pca_itens_especificos")
      .upsert(payloadEspecificos, { onConflict: "catalogo_id,codigo" })
      .select("id,codigo");
    if (erroEspecificos) throw erroEspecificos;
    const mapaEspecificos = new Map<string, string>();
    for (const item of dadosEspecificos ?? []) {
      mapaEspecificos.set(String(item.codigo), String(item.id));
    }
    resultado.itensEspecificos = payloadEspecificos.length;

    const payloadClasses = [...classes.entries()].map(([codigo, linha]) => ({
      catalogo_id: catalogoId,
      item_especifico_id: mapaEspecificos.get(linha.codigoEspecifico) ?? null,
      codigo,
      descricao: linha.descricaoClasse,
      valor: linha.valor,
      quantidade: linha.quantidade,
      unidade_medida: linha.unidade || null,
      especificacao: linha.especificacao || null,
      justificativa: linha.justificativa || null,
      observacoes: linha.observacoes || null,
      atualizado_em: agora,
    }));
    const { error: erroClasses } = await supabase
      .from("pca_classes")
      .upsert(payloadClasses, { onConflict: "catalogo_id,codigo" });
    if (erroClasses) throw erroClasses;
    resultado.classes = payloadClasses.length;

    resultado.processadas = linhas.length;

    const { data: valores } = await supabase
      .from("pca_classes")
      .select("valor")
      .eq("catalogo_id", catalogoId);
    const total = (valores ?? []).reduce(
      (soma, item) => soma + Number((item as { valor: number }).valor ?? 0),
      0,
    );
    await supabase
      .from("pca_catalogos")
      .update({ valor_total: total, atualizado_em: agora })
      .eq("id", catalogoId);
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : "Erro inesperado ao gravar os itens.";
    resultado.erros.push(`Erro ao processar: ${mensagem}`);
  }

  return resultado;
}
