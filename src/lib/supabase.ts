import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase do SisPatri.
 *
 * As credenciais publicas (URL do projeto e anon/publishable key) podem chegar de
 * diferentes lugares, dependendo de como o projeto foi publicado:
 *
 *  1. variaveis de ambiente do build (VITE_SUPABASE_URL / SUPABASE_URL, etc.);
 *  2. injecao em tempo de execucao (window.__SUPABASE_URL__ / window.__SUPABASE_ANON_KEY__);
 *  3. Edge Function "config-app" do proprio projeto (so a URL e necessaria para chegar nela);
 *  4. cache no navegador (localStorage), evitando nova busca a cada recarga.
 *
 * A inicializacao e assincrona (ver `inicializarSupabase`) porque o item 3 exige rede.
 * Por isso `main.tsx` aguarda a inicializacao antes de montar a aplicacao.
 */

export interface ConfigSupabase {
  url: string;
  anonKey: string;
}

const CHAVE_CACHE = "sispatri.supabase.config";
const FUNCAO_CONFIG = "config-app";

/**
 * Configuracao publica padrao do projeto SisPatri.
 *
 * A URL do projeto e a chave "publishable"/anon sao credenciais publicas por
 * natureza (a seguranca do banco esta no RLS), e o frontend precisa delas
 * para falar com o Auth e o PostgREST. Elas sao usadas como ultimo recurso,
 * quando nao ha variavel de ambiente nem cache no navegador.
 */
const CONFIG_PADRAO: ConfigSupabase = {
  url: "https://dufcszdrqusytjseqmqh.supabase.co",
  anonKey: "sb_publishable_rGgqHeGIRsEEjkGhXIGAiQ_j3i3yg3K",
};

const env = import.meta.env as unknown as Record<string, string | undefined>;

function primeiroDefinido(...nomes: string[]): string | undefined {
  for (const nome of nomes) {
    const valor = env[nome];
    if (valor && valor.trim().length > 0) return valor.trim();
  }
  return undefined;
}

function ehUrlValida(valor: string | undefined): valor is string {
  return Boolean(valor && /^https?:\/\//i.test(valor.trim()));
}

function configDoAmbiente(): Partial<ConfigSupabase> {
  return {
    url: primeiroDefinido(
      "VITE_SUPABASE_URL",
      "SUPABASE_URL",
      "VITE_SUPABASE_PROJECT_URL",
      "SUPABASE_PROJECT_URL",
    ),
    anonKey: primeiroDefinido(
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}

function configDaJanela(): Partial<ConfigSupabase> {
  if (typeof window === "undefined") return {};
  const w = window as unknown as Record<string, unknown>;
  const ler = (nomes: string[]): string | undefined => {
    for (const nome of nomes) {
      const valor = w[nome];
      if (typeof valor === "string" && valor.trim().length > 0) return valor.trim();
    }
    return undefined;
  };
  const bloco = w.__SUPABASE_CONFIG__ as Record<string, unknown> | undefined;
  return {
    url: ler(["__SUPABASE_URL__", "SUPABASE_URL"]) ??
      (typeof bloco?.url === "string" ? bloco.url : undefined),
    anonKey:
      ler(["__SUPABASE_ANON_KEY__", "__SUPABASE_PUBLISHABLE_KEY__", "SUPABASE_ANON_KEY"]) ??
      (typeof bloco?.anonKey === "string" ? bloco.anonKey : undefined),
  };
}

function configDoCache(): Partial<ConfigSupabase> {
  if (typeof localStorage === "undefined") return {};
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    if (!bruto) return {};
    const dados = JSON.parse(bruto) as Partial<ConfigSupabase>;
    return { url: dados.url, anonKey: dados.anonKey };
  } catch {
    return {};
  }
}

function guardarNoCache(config: ConfigSupabase): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(config));
  } catch {
    /* armazenamento indisponivel: seguimos sem cache */
  }
}

/** Busca a chave publica na Edge Function de configuracao do proprio projeto. */
async function configDaFuncao(urlBase: string): Promise<Partial<ConfigSupabase>> {
  if (typeof fetch !== "function") return {};
  try {
    const resposta = await fetch(`${urlBase.replace(/\/$/, "")}/functions/v1/${FUNCAO_CONFIG}`, {
      cache: "no-store",
    });
    if (!resposta.ok) return {};
    const dados = (await resposta.json()) as Record<string, unknown>;
    return {
      url: typeof dados.url === "string" ? dados.url : undefined,
      anonKey: typeof dados.anonKey === "string" ? dados.anonKey : undefined,
    };
  } catch {
    return {};
  }
}

function mesclar(...fontes: Partial<ConfigSupabase>[]): Partial<ConfigSupabase> {
  const resultado: Partial<ConfigSupabase> = {};
  for (const fonte of fontes) {
    if (!resultado.url && ehUrlValida(fonte.url)) resultado.url = fonte.url.trim();
    if (!resultado.anonKey && fonte.anonKey && fonte.anonKey.trim().length > 0) {
      resultado.anonKey = fonte.anonKey.trim();
    }
  }
  return resultado;
}

let configAtual: ConfigSupabase | null = null;

/**
 * Procura as credenciais em todas as fontes conhecidas.
 * Retorna null quando nao foi possivel montar a configuracao completa.
 */
export async function resolverConfigSupabase(): Promise<ConfigSupabase | null> {
  const direta = mesclar(
    configDoAmbiente(),
    configDaJanela(),
    configDoCache(),
    CONFIG_PADRAO,
  );

  if (direta.url && !direta.anonKey) {
    // Temos a URL do projeto: a Edge Function devolve a chave publica.
    const daFuncao = await configDaFuncao(direta.url);
    const completa = mesclar(direta, daFuncao);
    if (completa.url && completa.anonKey) {
      const config: ConfigSupabase = { url: completa.url, anonKey: completa.anonKey };
      configAtual = config;
      guardarNoCache(config);
      return config;
    }
  }

  if (!direta.url || !direta.anonKey) return null;

  const config: ConfigSupabase = { url: direta.url, anonKey: direta.anonKey };
  configAtual = config;
  guardarNoCache(config);
  return config;
}

/**
 * Cliente do Supabase. Antes de `inicializarSupabase` ser concluido, ele aponta
 * para um endereco provisorio: nenhuma chamada real deve ser feita nesse periodo.
 */
export let supabase: SupabaseClient = createClient(
  "https://configuracao-pendente.supabase.co",
  "sem-chave",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Inicializa (ou reinicializa) o cliente com as credenciais encontradas. */
export async function inicializarSupabase(): Promise<boolean> {
  const config = configAtual ?? (await resolverConfigSupabase());
  if (!config) return false;

  supabase = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return true;
}

/** Indica se as credenciais do Supabase estao disponiveis. */
export function supabaseConfigurado(): boolean {
  return Boolean(configAtual?.url && configAtual?.anonKey);
}

/** Mensagem amigavel exibida ao usuario quando falta configuracao. */
export const mensagemConfiguracaoAusente =
  "Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.";
