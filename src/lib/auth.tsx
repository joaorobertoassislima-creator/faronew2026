import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigurado } from "@/lib/supabase";

export const PAPEIS = [
  "administrador",
  "agente_compras",
  "almoxarife",
  "gestor_aprovador",
  "servidor",
  "auditor",
] as const;

export type Papel = (typeof PAPEIS)[number];

export interface Perfil {
  id: string;
  nome: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  telefone: string | null;
  ativo: boolean;
  avatar_url: string | null;
}

interface AuthContextValue {
  usuario: User | null;
  sessao: Session | null;
  perfil: Perfil | null;
  papeis: Papel[];
  carregando: boolean;
  erroPerfil: string | null;
  entrar: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<string | null>;
  redefinirSenha: (novaSenha: string) => Promise<string | null>;
  possuiPapel: (papel: Papel) => boolean;
  ehAdministrador: boolean;
  atualizarPerfil: (dados: {
    nome: string;
    matricula: string | null;
    cargo: string | null;
    setor: string | null;
    telefone: string | null;
    avatar_url: string | null;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);

  const carregarDadosUsuario = useCallback(async (userId: string) => {
    const { data: dadosPerfil, error: erroP } = await supabase
      .from("profiles")
      .select("id, nome, matricula, cargo, setor, telefone, ativo, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (erroP) {
      setPerfil(null);
      setErroPerfil("Não foi possível carregar seus dados de perfil.");
      return;
    }

    setPerfil(dadosPerfil ?? null);

    if (!dadosPerfil) {
      setErroPerfil(
        "Seu usuário ainda não possui perfil cadastrado. Procure o Administrador do SisPatri.",
      );
      setPapeis([]);
      return;
    }

    if (dadosPerfil.ativo === false) {
      setErroPerfil("Seu usuário está inativo. Procure o Administrador do SisPatri.");
      setPapeis([]);
      return;
    }

    setErroPerfil(null);

    const { data: dadosPapeis } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    setPapeis((dadosPapeis ?? []).map((item) => item.role as Papel));
  }, []);

  useEffect(() => {
    let ativo = true;

    const inicializar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setSessao(data.session);
      setUsuario(data.session?.user ?? null);
      if (data.session?.user) {
        await carregarDadosUsuario(data.session.user.id);
      }
      if (ativo) setCarregando(false);
    };

    inicializar();

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!ativo) return;
      setSessao(novaSessao);
      setUsuario(novaSessao?.user ?? null);
      setCarregando(false);
      if (novaSessao?.user) {
        setTimeout(() => {
          if (ativo) void carregarDadosUsuario(novaSessao.user!.id);
        }, 0);
      } else {
        setPerfil(null);
        setPapeis([]);
        setErroPerfil(null);
      }
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, [carregarDadosUsuario]);

  const entrar = useCallback(async (email: string, senha: string) => {
    if (!supabaseConfigurado()) {
      return "Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.";
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) {
        return "E-mail ou senha inválidos. Verifique os dados e tente novamente.";
      }
      return error.message;
    }
    return null;
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setPapeis([]);
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    if (!supabaseConfigurado()) {
      return "Conexão com o Supabase não configurada. Verifique as variáveis de ambiente do projeto.";
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) return error.message;
    return null;
  }, []);

  const redefinirSenha = useCallback(async (novaSenha: string) => {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) return error.message;
    return null;
  }, []);

  const atualizarPerfil = useCallback(
    async (dados: {
      nome: string;
      matricula: string | null;
      cargo: string | null;
      setor: string | null;
      telefone: string | null;
      avatar_url: string | null;
    }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(dados)
        .eq("id", usuario?.id ?? "")
        .select("id, nome, matricula, cargo, setor, telefone, ativo, avatar_url")
        .maybeSingle();

      if (error) return error.message;
      if (data) setPerfil(data as Perfil);
      return null;
    },
    [usuario?.id],
  );

  const possuiPapel = useCallback(
    (papel: Papel) => papeis.includes(papel),
    [papeis],
  );

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      sessao,
      perfil,
      papeis,
      carregando,
      erroPerfil,
      entrar,
      sair,
      recuperarSenha,
      redefinirSenha,
      possuiPapel,
      ehAdministrador: papeis.includes("administrador"),
      atualizarPerfil,
    }),
    [
      usuario,
      sessao,
      perfil,
      papeis,
      carregando,
      erroPerfil,
      entrar,
      sair,
      recuperarSenha,
      redefinirSenha,
      possuiPapel,
      atualizarPerfil,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return contexto;
}
