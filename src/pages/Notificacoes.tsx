import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellOff,
  CheckCheck,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  excluirNotificacao,
  gerarAvisosVencimento,
  listarNotificacoes,
  marcarComoLida,
  marcarComoNaoLida,
  marcarTodasComoLidas,
  rotuloTipo,
  type Notificacao,
} from "@/lib/notificacoes";
import { useNotificacoes } from "@/lib/notificacoesContexto";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function Notificacoes() {
  const { usuario } = useAuth();
  const { recarregar } = useNotificacoes();
  const { toast } = useToast();

  const [lista, setLista] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    setCarregando(true);
    try {
      await gerarAvisosVencimento().catch(() => undefined);
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

  async function marcarNaoLida(notificacao: Notificacao) {
    setProcessando(notificacao.id);
    try {
      if (notificacao.lida) {
        await marcarComoNaoLida(notificacao.id);
        setLista((atual) =>
          atual.map((item) =>
            item.id === notificacao.id ? { ...item, lida: false } : item,
          ),
        );
        recarregar();
        toast("Notificação marcada como não lida.", "sucesso");
      }
    } catch (erro) {
      toast(mensagemErro(erro), "erro");
    } finally {
      setProcessando(null);
    }
  }

  async function marcarTodas() {
    if (!usuario?.id) return;
    setProcessando("todas");
    try {
      await marcarTodasComoLidas(usuario.id);
      setLista((atual) => atual.map((item) => ({ ...item, lida: true })));
      recarregar();
      toast("Todas as notificações foram marcadas como lidas.", "sucesso");
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

  const naoLidas = lista.filter((item) => !item.lida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Central de Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Avisos do sistema sobre o que você precisa saber.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={marcarTodas}
          disabled={processando === "todas" || naoLidas === 0}
        >
          {processando === "todas" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Marcar todas como lidas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notificações
            {naoLidas > 0 && (
              <Badge variant="danger">{naoLidas} não lida{naoLidas > 1 ? "s" : ""}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando notificações…
            </div>
          )}

          {!carregando && lista.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação por aqui no momento.
              </p>
            </div>
          )}

          {lista.map((notificacao) => (
            <div
              key={notificacao.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                notificacao.lida ? "bg-card" : "border-primary/30 bg-primary/5",
              )}
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
                  {!notificacao.lida && (
                    <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Não lida" />
                  )}
                </div>
                {notificacao.mensagem && (
                  <p className="mt-1 text-sm text-muted-foreground">{notificacao.mensagem}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {new Date(notificacao.criado_em).toLocaleString("pt-BR")}
                </p>
                {notificacao.link && (
                  <Link
                    to={notificacao.link}
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
                  disabled={notificacao.lida || processando === notificacao.id}
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
                  aria-label="Marcar como não lida"
                  title="Marcar como não lida"
                  disabled={!notificacao.lida || processando === notificacao.id}
                  onClick={() => marcarNaoLida(notificacao)}
                >
                  {processando === notificacao.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir notificação"
                  title="Excluir notificação"
                  disabled={processando === notificacao.id}
                  onClick={() => excluir(notificacao)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
