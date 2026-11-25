import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { traduzirErroSupabase } from "@/lib/erros";
import {
  NATUREZAS_SOCIAIS,
  STATUS_FORNECEDOR,
  TIPOS_PESSOA,
  UFS,
  enderecoCompleto,
  formatarCep,
  formatarDocumento,
  rotuloStatusFornecedor,
  somenteDigitos,
  varianteStatusFornecedor,
  type Fornecedor,
} from "@/lib/fornecedores";

interface Formulario {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  natureza_social: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  responsavel_nome: string;
  responsavel_cargo: string;
  responsavel_telefone: string;
  responsavel_email: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_pessoa: string;
  status: string;
  observacoes: string;
}

const FORMULARIO_VAZIO: Formulario = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  natureza_social: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  email: "",
  site: "",
  responsavel_nome: "",
  responsavel_cargo: "",
  responsavel_telefone: "",
  responsavel_email: "",
  banco: "",
  agencia: "",
  conta: "",
  tipo_pessoa: "pj",
  status: "ativo",
  observacoes: "",
};

const POR_PAGINA = 10;

export default function Fornecedores() {
  const { papeis } = useAuth();
  const { toast } = useToast();
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [contratosPorFornecedor, setContratosPorFornecedor] = useState<
    Record<string, number>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<Fornecedor | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);
  const [pagina, setPagina] = useState(0);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("razao_social", { ascending: true });
    if (error) {
      const mensagem = traduzirErroSupabase(error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setFornecedores([]);
    } else {
      setFornecedores((data as Fornecedor[]) ?? []);
    }

    // Contagem de contratos por fornecedor (vinculados pelo CNPJ ou pelo nome).
    const { data: contratos } = await supabase
      .from("contratos")
      .select("fornecedor, cnpj");
    const contagem: Record<string, number> = {};
    for (const contrato of (contratos ?? []) as {
      fornecedor: string;
      cnpj: string | null;
    }[]) {
      const chave = somenteDigitos(contrato.cnpj) || contrato.fornecedor?.trim().toLowerCase();
      if (!chave) continue;
      contagem[chave] = (contagem[chave] ?? 0) + 1;
    }
    setContratosPorFornecedor(contagem);

    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fornecedores.filter((fornecedor) => {
      if (filtroStatus !== "todos" && fornecedor.status !== filtroStatus) {
        return false;
      }
      if (filtroTipo !== "todos" && fornecedor.tipo_pessoa !== filtroTipo) {
        return false;
      }
      if (!termo) return true;
      return [
        fornecedor.razao_social,
        fornecedor.nome_fantasia ?? "",
        fornecedor.cnpj ?? "",
        fornecedor.cidade ?? "",
        fornecedor.responsavel_nome ?? "",
        fornecedor.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [fornecedores, busca, filtroStatus, filtroTipo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const fornecedoresDaPagina = filtrados.slice(
    paginaAtual * POR_PAGINA,
    paginaAtual * POR_PAGINA + POR_PAGINA,
  );

  useEffect(() => {
    setPagina(0);
  }, [busca, filtroStatus, filtroTipo, filtrados.length]);

  const totais = useMemo(
    () => ({
      quantidade: fornecedores.length,
      ativos: fornecedores.filter((item) => item.status === "ativo").length,
      inativos: fornecedores.filter((item) => item.status !== "ativo").length,
      comContratos: fornecedores.filter((item) => {
        const chave =
          somenteDigitos(item.cnpj) || item.razao_social.trim().toLowerCase();
        return (contratosPorFornecedor[chave] ?? 0) > 0;
      }).length,
    }),
    [fornecedores, contratosPorFornecedor],
  );

  function abrirNovo() {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function abrirEdicao(fornecedor: Fornecedor) {
    setEditando(fornecedor);
    setFormulario({
      razao_social: fornecedor.razao_social ?? "",
      nome_fantasia: fornecedor.nome_fantasia ?? "",
      cnpj: fornecedor.cnpj ?? "",
      inscricao_estadual: fornecedor.inscricao_estadual ?? "",
      natureza_social: fornecedor.natureza_social ?? "",
      cep: fornecedor.cep ?? "",
      logradouro: fornecedor.logradouro ?? "",
      numero: fornecedor.numero ?? "",
      complemento: fornecedor.complemento ?? "",
      bairro: fornecedor.bairro ?? "",
      cidade: fornecedor.cidade ?? "",
      uf: fornecedor.uf ?? "",
      telefone: fornecedor.telefone ?? "",
      email: fornecedor.email ?? "",
      site: fornecedor.site ?? "",
      responsavel_nome: fornecedor.responsavel_nome ?? "",
      responsavel_cargo: fornecedor.responsavel_cargo ?? "",
      responsavel_telefone: fornecedor.responsavel_telefone ?? "",
      responsavel_email: fornecedor.responsavel_email ?? "",
      banco: fornecedor.banco ?? "",
      agencia: fornecedor.agencia ?? "",
      conta: fornecedor.conta ?? "",
      tipo_pessoa: fornecedor.tipo_pessoa ?? "pj",
      status: fornecedor.status ?? "ativo",
      observacoes: fornecedor.observacoes ?? "",
    });
    setErroFormulario(null);
    setDialogoAberto(true);
  }

  function alterar(campo: keyof Formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    if (!formulario.razao_social.trim()) {
      setErroFormulario("Informe a razão social do fornecedor.");
      return;
    }
    const digitosCnpj = somenteDigitos(formulario.cnpj);
    if (digitosCnpj && digitosCnpj.length !== 14 && digitosCnpj.length !== 11) {
      setErroFormulario("Informe um CNPJ (14 dígitos) ou CPF (11 dígitos) válido.");
      return;
    }
    if (formulario.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email)) {
      setErroFormulario("Informe um e-mail válido.");
      return;
    }
    if (
      formulario.responsavel_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.responsavel_email)
    ) {
      setErroFormulario("Informe um e-mail válido para o responsável.");
      return;
    }

    setSalvando(true);
    setErroFormulario(null);

    const dados = {
      razao_social: formulario.razao_social.trim(),
      nome_fantasia: formulario.nome_fantasia.trim() || null,
      cnpj: digitosCnpj || null,
      inscricao_estadual: formulario.inscricao_estadual.trim() || null,
      natureza_social: formulario.natureza_social.trim() || null,
      cep: somenteDigitos(formulario.cep) || null,
      logradouro: formulario.logradouro.trim() || null,
      numero: formulario.numero.trim() || null,
      complemento: formulario.complemento.trim() || null,
      bairro: formulario.bairro.trim() || null,
      cidade: formulario.cidade.trim() || null,
      uf: formulario.uf.trim() || null,
      telefone: formulario.telefone.trim() || null,
      email: formulario.email.trim() || null,
      site: formulario.site.trim() || null,
      responsavel_nome: formulario.responsavel_nome.trim() || null,
      responsavel_cargo: formulario.responsavel_cargo.trim() || null,
      responsavel_telefone: formulario.responsavel_telefone.trim() || null,
      responsavel_email: formulario.responsavel_email.trim() || null,
      banco: formulario.banco.trim() || null,
      agencia: formulario.agencia.trim() || null,
      conta: formulario.conta.trim() || null,
      tipo_pessoa: formulario.tipo_pessoa,
      status: formulario.status,
      observacoes: formulario.observacoes.trim() || null,
    };

    const resultado = editando
      ? await supabase.from("fornecedores").update(dados).eq("id", editando.id)
      : await supabase.from("fornecedores").insert(dados);

    setSalvando(false);

    if (resultado.error) {
      const mensagem = traduzirErroSupabase(resultado.error.message);
      setErroFormulario(mensagem);
      toast(mensagem, "erro");
      return;
    }

    setDialogoAberto(false);
    toast(
      editando
        ? "Fornecedor atualizado com sucesso."
        : "Fornecedor registrado com sucesso.",
    );
    await carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    const { error } = await supabase
      .from("fornecedores")
      .delete()
      .eq("id", excluindo.id);
    setProcessandoExclusao(false);
    if (error) {
      const mensagem = traduzirErroSupabase(error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setExcluindo(null);
      return;
    }
    setExcluindo(null);
    toast("Fornecedor excluído.");
    await carregar();
  }
