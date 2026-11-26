import {
  ArrowRight,
  Boxes,
  ClipboardList,
  FileSignature,
  FileText,
  Gavel,
  ScrollText,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth, type Papel } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarData } from "@/lib/format";
import { useAvisoToast } from "@/lib/avisos";
import ModalNotificacoes from "@/components/notificacoes/ModalNotificacoes";

interface Atalho {
  titulo: string;
  descricao: string;
  icone: typeof Boxes;
  rota: string;
  papeis: Papel[];
  disponivel?: boolean;
}

const ATALHOS: Atalho[] = [
  {
    titulo: "Requisições de Compra",
    descricao: "Crie e acompanhe requisições, com fluxo de aprovação.",
    icone: ClipboardList,
    rota: "/requisicoes",
    papeis: ["administrador", "servidor", "gestor_aprovador", "agente_compras", "auditor"],
  },
  {
    titulo: "Estoque",
    descricao: "Consulta de saldos, itens e localizações do almoxarifado.",
    icone: Boxes,
    rota: "/estoque",
    papeis: ["administrador", "almoxarife", "agente_compras", "auditor"],
  },
  {
    titulo: "Fornecedores",
    descricao: "Cadastro e histórico de fornecedores contratos.",
    icone: Truck,
    rota: "/fornecedores",
    papeis: ["administrador", "agente_compras", "auditor"],
  },
  {
    titulo: "Contratos",
    descricao: "Contratos vigentes, vigências e aditivos.",
    icone: FileSignature,
    rota: "/contratos",
    papeis: ["administrador", "agente_compras", "auditor"],
    disponivel: true,
  },
  {
    titulo: "Atas de Registro de Preço",
    descricao: "Atas vigentes e itens registrados por ata.",
    icone: FileText,
    rota: "/atas",
    papeis: ["administrador", "agente_compras", "auditor"],
  },
  {
    titulo: "Licitações",
    descricao: "Processos licitatórios e cronograma.",
    icone: Gavel,
    rota: "/licitacoes",
    papeis: ["administrador", "agente_compras", "auditor"],
  },
  {
    titulo: "Usuários e Perfis",
    descricao: "Gerencie acessos, perfis e papéis dos servidores.",
    icone: Users,
    rota: "/usuarios",
    papeis: ["administrador"],
  },
  {
    titulo: "Auditoria",
    descricao: "Histórico de alterações nos módulos do sistema.",
    icone: ScrollText,
    rota: "/auditoria",
    papeis: ["administrador", "auditor"],
  },
];

export default function Home() {
  const { perfil, papeis, erroPerfil } = useAuth();
  const hoje = formatarData(new Date());

  useAvisoToast(erroPerfil, "erro");

  const atalhos = ATALHOS.filter((atalho) =>
    atalho.papeis.some((papel) => papeis.includes(papel)),
  );

  return (
    <div className="space-y-6">
      <ModalNotificacoes />
      <header className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Secretaria de Planejamento e Finanças – Prefeitura de Ourinhos/SP
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Olá, {perfil?.nome?.split(" ")[0] ?? "bem-vindo(a)"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hoje é {hoje}. Use os atalhos abaixo para acessar os módulos do SisPatri.
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Cargo</dt>
            <dd className="text-sm font-medium">{perfil?.cargo ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Setor</dt>
            <dd className="text-sm font-medium">{perfil?.setor ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Matrícula</dt>
            <dd className="text-sm font-medium">{perfil?.matricula ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Perfis</dt>
            <dd className="text-sm font-medium capitalize">
              {papeis.length ? papeis.join(", ").replace(/_/g, " ") : "—"}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Módulos do sistema</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {atalhos.map((atalho) => {
            const Icone = atalho.icone;
            return (
              <Card key={atalho.rota} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icone className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-base">{atalho.titulo}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">{atalho.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {atalho.disponivel ? (
                    <Link
                      to={atalho.rota}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Acessar módulo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      Módulo em construção
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/40 p-5">
        <h2 className="text-sm font-semibold">Sobre o SisPatri</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sistema de controle de estoque e compras da Prefeitura Municipal de Ourinhos/SP. Os módulos
          de requisições, estoque, fornecedores, contratos, atas, licitações e auditoria estão em
          construção e serão liberados por módulo, de acordo com o seu perfil de acesso.
        </p>
      </section>
    </div>
  );
}
