import { createClient } from "@supabase/supabase-js";

/**
 * Le as credenciais do Supabase a partir das variaveis de ambiente.
 *
 * O projeto pode declarar as chaves com ou sem o prefixo "VITE_".
 * Por isso o vite.config.ts usa envPrefix: ["VITE_", "SUPABASE_"] e aqui
 * procuramos os nomes mais usuais.
 */
const env = import.meta.env as unknown as Record<string, string | undefined>;

function primeiroDefinido(...nomes: string[]): string | undefined {
  for (const nome of nomes) {
    const valor = env[nome];
    if (valor && valor.trim().length > 0) return valor.trim();
  }
  return undefined;
}

const url = primeiroDefinido(
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "VITE_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
);

const anonKey = primeiroDefinido(
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);

/** Indica se as credenciais do Supabase foram encontradas no ambiente. */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? "https://configuracao-pendente.supabase.co",
  anonKey ?? "sem-chave",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Mensagem amigavel exibida ao usuario quando falta configuracao. */
export const mensagemConfiguracaoAusente =
  "Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.";
