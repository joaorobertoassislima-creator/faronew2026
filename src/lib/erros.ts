/**
 * Traducao de mensagens de erro do Supabase para o portugues do Brasil.
 *
 * O cliente Supabase devolve mensagens em ingles (por exemplo, quando a
 * Edge Function nao consegue ser acionada). No SisPatri o usuario final
 * nao deve ver texto tecnico: estas traducoes mantem o sentido da falha.
 */

const TRADUCOES: Record<string, string> = {
  "Failed to send a request to the Edge Function":
    "Nao foi possivel falar com o servidor do SisPatri agora. Verifique sua conexao e tente novamente em instantes.",
  "Failed to fetch":
    "Nao foi possivel falar com o servidor do SisPatri agora. Verifique sua conexao e tente novamente em instantes.",
  "NetworkError when attempting to fetch resource":
    "Nao foi possivel falar com o servidor do SisPatri agora. Verifique sua conexao e tente novamente em instantes.",
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "User already registered": "Ja existe uma conta com este e-mail.",
  "Password should be at least 8 characters.":
    "A senha deve ter no minimo 8 caracteres.",
  "Email not confirmed": "O e-mail ainda nao foi confirmado.",
  "Rate limit exceeded": "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
};

export function traduzirErroSupabase(mensagem: string | undefined | null): string {
  if (!mensagem) return "Ocorreu um erro inesperado. Tente novamente.";
  const original = mensagem.trim();
  const direto = TRADUCOES[original];
  if (direto) return direto;

  const chave = Object.keys(TRADUCOES).find(
    (k) => original.toLowerCase().includes(k.toLowerCase()),
  );
  if (chave) return TRADUCOES[chave];

  return original;
}
