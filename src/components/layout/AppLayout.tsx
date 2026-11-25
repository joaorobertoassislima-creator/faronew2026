import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Boxes,
  ClipboardList,
  FileSignature,
  FileText,
  Gavel,
  Home as HomeIcon,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useAuth, type Papel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ItemMenu {
  titulo: string;
  rota: string;
  icone: typeof HomeIcon;
  papeis?: Papel[];
  disponivel?: boolean;
}

const ITENS_MENU: ItemMenu[] = [
  { titulo: "Início", rota: "/", icone: HomeIcon },
  {
    titulo: "Requisições de Compra",
    rota: "/requisicoes",
    icone: ClipboardList,
    papeis: ["administrador", "servidor", "gestor_aprovador", "agente_compras", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Estoque",
    rota: "/estoque",
    icone: Boxes,
    papeis: ["administrador", "almoxarife", "agente_compras", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Entradas e Saídas",
    rota: "/movimentacoes",
    icone: Package,
    papeis: ["administrador", "almoxarife", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Fornecedores",
    rota: "/fornecedores",
    icone: Truck,
    papeis: ["administrador", "agente_compras", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Contratos",
    rota: "/contratos",
    icone: FileSignature,
    papeis: ["administrador", "agente_compras", "auditor"],
  },
  {
    titulo: "Atas de Registro de Preço",
    rota: "/atas",
    icone: FileText,
    papeis: ["administrador", "agente_compras", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Licitações",
    rota: "/licitacoes",
    icone: Gavel,
    papeis: ["administrador", "agente_compras", "auditor"],
    disponivel: false,
  },
  {
    titulo: "Usuários e Perfis",
    rota: "/usuarios",
    icone: Users,
    papeis: ["administrador"],
    disponivel: false,
  },
  {
    titulo: "Auditoria",
    rota: "/auditoria",
    icone: ScrollText,
    papeis: ["administrador", "auditor"],
    disponivel: false,
  },
];

function itensVisiveis(papeis: Papel[]) {
  return ITENS_MENU.filter(
    (item) => !item.papeis || item.papeis.some((papel) => papeis.includes(papel)),
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { perfil, papeis, sair } = useAuth();
  const navegar = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const { toast } = useToast();

  const itens = itensVisiveis(papeis);

  const conteudoMenu = (fechar: () => void) => (
    <nav className="flex flex-col gap-1 p-3">
      {itens.map((item) => {
        const Icone = item.icone;
        const desabilitado = item.disponivel === false;
        if (desabilitado) {
          return (
            <span
              key={item.rota}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              title="Módulo em construção"
            >
              <Icone className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.titulo}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Em breve
              </span>
            </span>
          );
        }
        return (
          <NavLink
            key={item.rota}
            to={item.rota}
            onClick={fechar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <Icone className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.titulo}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  const perfilRodape = (
    <div className="border-t border-border p-3">
      <div className="mb-2 px-3">
        <p className="truncate text-sm font-semibold">{perfil?.nome ?? "Usuário"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {perfil?.cargo ?? perfil?.setor ?? "Sem cargo informado"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={async () => {
          await sair();
          toast("Sessão encerrada com sucesso.", "info");
          navegar("/login");
        }}
      >
        <LogOut className="h-4 w-4" />
        Sair do sistema
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">SisPatri</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">SisPatri</p>
            <p className="text-[11px] text-muted-foreground">Ourinhos/SP</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{conteudoMenu(() => undefined)}</div>
        {perfilRodape}
      </aside>

      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuAberto(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar menu"
                onClick={() => setMenuAberto(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{conteudoMenu(() => setMenuAberto(false))}</div>
            {perfilRodape}
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <main className="pb-20 lg:pb-8 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card py-2 lg:hidden">
        {itens.slice(0, 4).map((item) => {
          const Icone = item.icone;
          if (item.disponivel === false) {
            return (
              <span
                key={item.rota}
                className="flex flex-col items-center gap-0.5 px-2 text-[10px] text-muted-foreground/60"
              >
                <Icone className="h-5 w-5" />
                <span className="max-w-[64px] truncate">{item.titulo.split(" ")[0]}</span>
              </span>
            );
          }
          return (
            <NavLink
              key={item.rota}
              to={item.rota}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-2 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <Icone className="h-5 w-5" />
              <span className="max-w-[64px] truncate">{item.titulo.split(" ")[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
