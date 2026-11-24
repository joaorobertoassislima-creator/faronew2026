import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, KeyRound, Loader2, Lock, Mail, Package, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  const { entrar, recuperarSenha } = useAuth();
  const navegar = useNavigate();

  const [modo, setModo] = useState<"login" | "recuperacao">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!email.trim()) {
      setErro("Informe o e-mail institucional.");
      return;
    }

    setEnviando(true);
    try {
      if (modo === "login") {
        if (!senha) {
          setErro("Informe a sua senha.");
          setEnviando(false);
          return;
        }
        const mensagem = await entrar(email, senha);
        if (mensagem) {
          setErro(mensagem);
        } else {
          navegar("/", { replace: true });
        }
      } else {
        const mensagem = await recuperarSenha(email);
        if (mensagem) {
          setErro(mensagem);
        } else {
          setSucesso(
            "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.",
          );
        }
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel institucional */}
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Package className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold">SisPatri</p>
            <p className="text-sm text-primary-foreground/80">
              Controle de Estoque e Compras
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-snug">
            Secretaria de Planejamento e Finanças
          </h1>
          <p className="text-sm text-primary-foreground/85">
            Gestão integrada de requisições de compra, almoxarifado, contratos, atas de registro
            de preço e licitações da Prefeitura de Ourinhos/SP.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Acesso por perfil, com registro de auditoria
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Senhas protegidas pelo Supabase Auth
            </li>
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Prefeitura Municipal de Ourinhos/SP
        </p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">SisPatri</p>
              <p className="text-xs text-muted-foreground">
                Controle de Estoque e Compras – Ourinhos/SP
              </p>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {modo === "login" ? (
                <>
                  <h2 className="text-xl font-semibold">Acessar sistema</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Informe suas credenciais para entrar.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Recuperar senha</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enviaremos um e-mail com o link para definir uma nova senha.
                  </p>
                </>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail institucional</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nome@ourinhos.sp.gov.br"
                      className="pl-9"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                    />
                  </div>
                </div>

                {modo === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="senha">Senha</Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setModo("recuperacao");
                          setErro(null);
                          setSucesso(null);
                        }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="senha"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Sua senha"
                        className="pl-9"
                        value={senha}
                        onChange={(evento) => setSenha(evento.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {erro && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                {sucesso && (
                  <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{sucesso}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modo === "login" ? "Entrar" : "Enviar instruções"}
                </Button>

                {modo === "recuperacao" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={() => {
                      setModo("login");
                      setErro(null);
                      setSucesso(null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                  </Button>
                )}
              </form>

              <p className="mt-6 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                @2026 - Desenvolvido pela Equipe de Gestão Tributária da SMPF. Em caso de dúvida, procure a Secretaria de Planejamento e Finanças.
              </p>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Precisa redefinir a senha?{" "}
            <Link to="/redefinir-senha" className="font-medium text-primary hover:underline">
              Abrir definição de nova senha
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
