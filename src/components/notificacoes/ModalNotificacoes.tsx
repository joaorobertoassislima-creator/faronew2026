import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Eye, Loader2, Trash2 } from "lucide-react";
import {
  excluirNotificacao,
  listarNotificacoes,
  marcarComoLida,
  rotuloTipo,
  type Notificacao,
} from "@/lib/notificacoes";
import { useNotificacoes } from "@/lib/notificacoesContexto";
import { useAuth } from "@/lib/auth";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function mensagemErro(erro: unknown): string {
  return traduzirErroSupabase(erro instanceof Error ? erro.message : String(erro));
}

const estiloTipo: Record<string, string> = {
  sucesso: "border-emerald-200 bg-emerald-50 text-emerald-800",
  alteracao: "border-amber-200 bg-amber-50 text-amber-800",
  exclusao: "border-destructive/30 bg-destructive/10 text-destructive",
  vencimento: "border-orange-200 bg-orange-50 text-orange-800",
  info: "border-border bg-muted text-muted-foreground",
};

/**
 * Janela grande exibida a cada entrada na página inicial, com as
 * notificações ainda não lidas do usuário.
 */
export default function ModalNotificacoes() {
  const { usuario } = useAuth();
  const { recarregar } = useNotificacoes();
  const { toast } = useToast();

  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    // Exibe o painel grande uma vez a cada login, na entrada na página inicial,
    // mesmo quando não houver notificações pendentes.
    const chave = `sispatri:popup-notificacoes:${usuario.id}`;
    if (window.sessionStorage.getItem(chave) !== "1") {
      window.sessionStorage.setItem(chave, "1");
      setAberto(true);
    }
    setCarregando(true);
    try {
      const dados = await listarNotificacoes(usuario.id);
      setLista(dados);
      recarregar();
    } catch (erro) {
      toast(mensagemErro(erro), "erro");
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id, toast, recarregar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarLida(notificacao: Notificacao) {
    setProcessando(notificacao.id);
    try {
      if (!notificacao.lida) {
        await marcarComoLida(notificacao.id);
        setLista((atual) =>
          atual.map((item) =>
            item.id === notificacao.id ? { ...item, lida: true } : item,
          ),
        );
        recarregar();
        toast("Notificação marcada como lida.", "sucesso");
      }
    } catch (erro) {
      toast(mensagemErro(erro), "erro");
    } finally {
      setProcessando(null);
    }
  }

  async function excluir(notificacao: Notificacao) {
    setProcessando(notificacao.id);
    try {
      await excluirNotificacao(notificacao.id);
      setLista((atual) => atual.filter((item) => item.id !== notificacao.id));
      recarregar();
      toast("Notificação excluída.", "sucesso");
    } catch (erro) {
      toast(mensagemErro(erro), "erro");
    } finally {
      setProcessando(null);
    }
  }

  const naoLidas = lista.filter((item) => !item.lida);

  return (
    <Dialog
      aberto={aberto}
      titulo="Suas Notificações"
      descricao={
        naoLidas.length
          ? `${naoLidas.length} notificaç${naoLidas.length > 1 ? "ões" : "ão"} aguardando leitura.`
          : undefined
      }
      largura="max-w-2xl"
      aoFechar={() => setAberto(false)}
      rodape={
        <>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Fechar
          </Button>
          <Button asChild>
            <Link
              to="/notificacoes"
              onClick={() => setAberto(false)}
              title="Abrir a central de notificações"
            >
              Ver central de notificações
            </Link>
          </Button>
        </>
      }
    >
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando notificações…
        </div>
      )}

      {!carregando && naoLidas.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <BellRing className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Você está em dia!</p>
          <p className="text-sm text-muted-foreground">
            Não há notificações pendentes no momento.
          </p>
        </div>
      )}

      {!carregando && naoLidas.length > 0 && (
        <ul className="space-y-3">
          {naoLidas.map((notificacao) => (
            <li
              key={notificacao.id}
              className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{notificacao.titulo}</p>
                  <Badge
                    variant="outline"
                    className={estiloTipo[notificacao.tipo] ?? estiloTipo.info}
                  >
                    {rotuloTipo(notificacao.tipo)}
                  </Badge>
                </div>
                {notificacao.mensagem && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notificacao.mensagem}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {new Date(notificacao.criado_em).toLocaleString("pt-BR")}
                </p>
                {notificacao.link && (
                  <Link
                    to={notificacao.link}
                    onClick={() => setAberto(false)}
                    className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    {notificacao.contrato_id ? "Ver contrato" : "Ver no sistema"}
                  </Link>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Marcar como lida"
                  title="Marcar como lida"
                  disabled={processando === notificacao.id}
                  onClick={() => marcarLida(notificacao)}
                >
                  {processando === notificacao.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir notificação"
                  title="Excluir notificação"
                  disabled={processando === notificacao.id}
                  onClick={() => excluir(notificacao)}
                  className={cn("text-destructive hover:text-destructive")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
