import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Hash,
  Loader2,
  Lock,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "@/lib/supabase";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function CadastroAdministrador() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!nome.trim()) {
      setErro("Informe o nome completo do administrador.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErro("Informe um e-mail institucional válido.");
      return;
    }
    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("A confirmação da senha não confere.");
      return;
    }
    if (!codigo.trim()) {
      setErro("Informe o código de instalação do SisPatri.");
      return;
    }
    if (!supabaseConfigurado()) {
      setErro("Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.");
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-administrador", {
        body: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
          matricula: matricula.trim(),
          cargo: cargo.trim(),
          setor: setor.trim(),
          telefone: telefone.trim(),
          codigo: codigo.trim(),
        },
      });

      if (error) {
        setErro(
          traduzirErroSupabase(error.message ?? "Não foi possível concluir o cadastro. Tente novamente."),
        );
        return;
      }

      const mensagem = (data as { erro?: string; mensagem?: string } | null) ?? {};

      if (mensagem.erro) {
        setErro(mensagem.erro);
        return;
      }

      setSucesso(mensagem.mensagem ?? "Administrador cadastrado com sucesso.");
      setNome("");
      setEmail("");
      setSenha("");
      setConfirmarSenha("");
      setMatricula("");
      setCargo("");
      setSetor("");
      setTelefone("");
      setCodigo("");
    } catch {
      setErro("Falha de comunicação com o servidor. Verifique sua conexão e tente novamente.");
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
            Cadastro do administrador do sistema
          </h1>
          <p className="text-sm text-primary-foreground/85">
            Esta página é exclusiva para a instalação inicial do SisPatri. O administrador
            cadastrado aqui será responsável pela gestão de usuários, perfis e permissões.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Acesso com perfil administrador (poder total)
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Senha protegida pelo Supabase Auth
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" /> Todos os demais usuários serão criados por ele
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
              <h2 className="text-xl font-semibold">Cadastrar administrador</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Preencha os dados abaixo para criar a conta do administrador do SisPatri.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nome"
                      autoComplete="name"
                      placeholder="Nome do administrador"
                      className="pl-9"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      required
                    />
                  </div>
                </div>

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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula</Label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="matricula"
                        placeholder="00000-0"
                        className="pl-9"
                        value={matricula}
                        onChange={(evento) => setMatricula(evento.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="telefone"
                        placeholder="(14) 0000-0000"
                        className="pl-9"
                        value={telefone}
                        onChange={(evento) => setTelefone(evento.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cargo"
                      placeholder="Ex.: Coordenador de Compras"
                      className="pl-9"
                      value={cargo}
                      onChange={(evento) => setCargo(evento.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setor">Setor</Label>
                  <Input
                    id="setor"
                    placeholder="Ex.: Secretaria de Planejamento e Finanças"
                    value={setor}
                    onChange={(evento) => setSetor(evento.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo de 8 caracteres"
                        className="pl-9"
                        value={senha}
                        onChange={(evento) => setSenha(evento.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmarSenha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repita a senha"
                        className="pl-9"
                        value={confirmarSenha}
                        onChange={(evento) => setConfirmarSenha(evento.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de instalação</Label>
                  <Input
                    id="codigo"
                    placeholder="Código informado pela equipe de instalação"
                    value={codigo}
                    onChange={(evento) => setCodigo(evento.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    O código é exigido para garantir que apenas a instalação autorizada crie o
                    primeiro administrador.
                  </p>
                </div>

                {erro && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                {sucesso && (
                  <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{sucesso}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cadastrar administrador
                </Button>

                <Button type="button" variant="ghost" className="w-full gap-2" asChild>
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4" /> Voltar para o login
                  </Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
