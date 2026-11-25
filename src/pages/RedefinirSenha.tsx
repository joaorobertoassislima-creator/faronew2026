import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, KeyRound, Loader2, Lock, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function RedefinirSenha() {
  const { redefinirSenha } = useAuth();
  const navegar = useNavigate();
  const { toast } = useToast();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As senhas informadas não conferem.");
      return;
    }

    setEnviando(true);
    const mensagem = await redefinirSenha(novaSenha);
    setEnviando(false);

    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setSucesso(true);
    toast("Senha redefinida com sucesso. Redirecionando para o login…");
    setTimeout(() => navegar("/login", { replace: true }), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
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
            <h2 className="text-xl font-semibold">Definir nova senha</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse esta página pelo link enviado no e-mail de recuperação.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="novaSenha"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    value={novaSenha}
                    onChange={(evento) => setNovaSenha(evento.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar nova senha</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmacao"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    value={confirmacao}
                    onChange={(evento) => setConfirmacao(evento.target.value)}
                    required
                  />
                </div>
              </div>

              {erro && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={enviando || sucesso}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => navegar("/login")}
            >
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
