import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Hash,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigurado } from "@/lib/supabase";
import { traduzirErroSupabase } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const BUCKET_AVATARES = "avatares";
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function Perfil() {
  const { perfil, usuario, papeis, atualizarPerfil } = useAuth();
  const { toast } = useToast();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome ?? "");
    setMatricula(perfil.matricula ?? "");
    setCargo(perfil.cargo ?? "");
    setSetor(perfil.setor ?? "");
    setTelefone(perfil.telefone ?? "");
    setAvatar(perfil.avatar_url ?? null);
  }, [perfil]);

  async function enviarFoto(arquivo: File) {
    if (!usuario) return;
    if (!arquivo.type.startsWith("image/")) {
      toast("Selecione um arquivo de imagem.", "erro");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      toast("A foto deve ter no máximo 2 MB.", "erro");
      return;
    }
    if (!supabaseConfigurado()) {
      setErro("Conexão com o Supabase não configurada.");
      return;
    }

    setEnviandoFoto(true);
    try {
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const caminho = `${usuario.id}/avatar-${Date.now()}.${extensao}`;
      const { error } = await supabase.storage
        .from(BUCKET_AVATARES)
        .upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "3600" });

      if (error) {
        toast(traduzirErroSupabase(error.message), "erro");
        return;
      }

      const { data } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(caminho);
      setAvatar(data.publicUrl);
      toast("Foto carregada. Salve o perfil para confirmar a alteração.");
    } catch {
      toast("Falha de comunicação com o servidor ao enviar a foto.", "erro");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Informe o seu nome completo.");
      return;
    }
    if (!supabaseConfigurado()) {
      setErro("Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.");
      return;
    }

    setSalvando(true);
    try {
      const mensagem = await atualizarPerfil({
        nome: nome.trim(),
        matricula: matricula.trim() || null,
        cargo: cargo.trim() || null,
        setor: setor.trim() || null,
        telefone: telefone.trim() || null,
        avatar_url: avatar,
      });

      if (mensagem) {
        toast(traduzirErroSupabase(mensagem), "erro");
        return;
      }

      toast("Perfil atualizado com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Atualize seus dados de identificação e a foto do usuário.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto do usuário</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt={`Foto de ${nome || "usuário"}`}
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {iniciais(nome || "")}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              disabled={enviandoFoto}
              aria-label="Alterar foto do usuário"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground disabled:opacity-60"
            >
              {enviandoFoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={inputArquivo}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                if (arquivo) void enviarFoto(arquivo);
                evento.target.value = "";
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>PNG, JPG, WEBP ou GIF, até 2 MB.</p>
            <p className="mt-1">Sem foto, mostramos suas iniciais.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="perfil-nome">Nome completo</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="perfil-nome"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="perfil-matricula">Matrícula</Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="perfil-matricula"
                    value={matricula}
                    onChange={(evento) => setMatricula(evento.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="perfil-telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="perfil-telefone"
                    value={telefone}
                    onChange={(evento) => setTelefone(evento.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil-cargo">Cargo</Label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="perfil-cargo"
                  value={cargo}
                  onChange={(evento) => setCargo(evento.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil-setor">Setor</Label>
              <Input
                id="perfil-setor"
                value={setor}
                onChange={(evento) => setSetor(evento.target.value)}
              />
            </div>

            {erro && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {erro}
              </div>
            )}

            <Button type="submit" disabled={salvando} className="gap-2">
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">E-mail de acesso:</span>
            <span className="font-medium">{usuario?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Perfis:</span>
            <span className="font-medium">
              {papeis.length > 0 ? papeis.join(", ") : "sem perfil atribuído"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
