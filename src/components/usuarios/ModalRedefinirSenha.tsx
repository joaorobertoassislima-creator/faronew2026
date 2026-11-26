import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Dialog from "@/components/ui/dialog";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: (senha: string) => Promise<void>;
  nomeUsuario: string;
}

export default function ModalRedefinirSenha({
  aberto,
  aoFechar,
  aoConfirmar,
  nomeUsuario,
}: Props) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setSenha("");
      setConfirmacao("");
      setErro(null);
      setSalvando(false);
    }
  }, [aberto]);

  async function confirmar() {
    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas informadas não conferem.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await aoConfirmar(senha);
    } catch (problema) {
      setErro(
        problema instanceof Error ? problema.message : "Não foi possível redefinir a senha.",
      );
      setSalvando(false);
    }
  }

  return (
    <Dialog
      aberto={aberto}
      titulo="Redefinir senha"
      descricao={`Defina uma nova senha de acesso para ${nomeUsuario}.`}
      aoFechar={aoFechar}
      largura="max-w-md"
      rodape={
        <>
          <button
            type="button"
            onClick={aoFechar}
            className="h-10 rounded-md border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar nova senha
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="redef-senha" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="redef-senha"
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="Mínimo de 8 caracteres"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="redef-confirmacao" className="text-sm font-medium">
            Confirmar nova senha
          </label>
          <input
            id="redef-confirmacao"
            type="password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            placeholder="Repita a nova senha"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {erro && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
    </Dialog>
  );
}
