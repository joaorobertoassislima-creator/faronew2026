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
  mascaraCep,
  mascaraDocumento,
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

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
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

  async function buscarDadosCnpj() {
    const digitos = somenteDigitos(formulario.cnpj);
    if (digitos.length !== 14) {
      setErroFormulario("Informe um CNPJ com 14 dígitos para consultar os dados.");
      return;
    }

    setBuscandoCnpj(true);
    setErroFormulario(null);
    try {
      const resposta = await fetch(`https://api.opencnpj.org/${digitos}`);
      if (!resposta.ok) {
        throw new Error("falha na consulta");
      }
      const json = await resposta.json();
      const empresa = (json?.empresa ?? json ?? {}) as Record<string, unknown>;

      const texto = (chave: string): string => {
        const valor = empresa[chave];
        return typeof valor === "string" ? valor.trim() : "";
      };

      const naturezaApi = texto("natureza_juridica") || texto("natureza_social");
      const natureza =
        NATUREZAS_SOCIAIS.find((item) =>
          naturezaApi.toLowerCase().includes(item.toLowerCase()),
        ) ?? "";

      setFormulario((atual) => ({
        ...atual,
        razao_social: texto("razao_social") || atual.razao_social,
        nome_fantasia: texto("nome_fantasia") || atual.nome_fantasia,
        inscricao_estadual: texto("inscricao_estadual") || atual.inscricao_estadual,
        natureza_social: natureza || atual.natureza_social,
        cep: mascaraCep(texto("cep")) || atual.cep,
        logradouro: texto("logradouro") || atual.logradouro,
        numero: texto("numero") || atual.numero,
        complemento: texto("complemento") || atual.complemento,
        bairro: texto("bairro") || atual.bairro,
        cidade: texto("municipio") || texto("cidade") || atual.cidade,
        uf: (texto("uf") || atual.uf).toUpperCase(),
        telefone: texto("telefone") || atual.telefone,
        email: texto("email") || atual.email,
        site: texto("site") || atual.site,
      }));

      toast("Dados preenchidos. Você pode editá-los antes de salvar.");
    } catch {
      const mensagem =
        "Não foi possível consultar o CNPJ. Verifique o número e tente novamente.";
      setErroFormulario(mensagem);
      toast(mensagem, "erro");
    } finally {
      setBuscandoCnpj(false);
    }
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Secretaria de Planejamento e Finanças – Prefeitura de Ourinhos/SP
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Truck className="h-6 w-6 text-primary" />
            Fornecedores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro individual dos fornecedores: dados cadastrais, endereço, contatos,
            responsável e dados bancários.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={abrirNovo} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Fornecedores
            </p>
            <p className="mt-1 text-xl font-semibold">{totais.quantidade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p>
            <p className="mt-1 text-xl font-semibold">{totais.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Inativos ou suspensos
            </p>
            <p className="mt-1 text-xl font-semibold">{totais.inativos}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Com contratos
            </p>
            <p className="mt-1 text-xl font-semibold">{totais.comContratos}</p>
          </CardContent>
        </Card>
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p>{erro}</p>
            <Button variant="link" className="h-auto p-0" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca"
                  className="pl-9"
                  placeholder="Razão social, CNPJ, cidade…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-status">Status</Label>
              <Select
                id="filtro-status"
                className="mt-1"
                value={filtroStatus}
                onChange={(evento) => setFiltroStatus(evento.target.value)}
              >
                <option value="todos">Todos</option>
                {STATUS_FORNECEDOR.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-tipo">Tipo</Label>
              <Select
                id="filtro-tipo"
                className="mt-1"
                value={filtroTipo}
                onChange={(evento) => setFiltroTipo(evento.target.value)}
              >
                <option value="todos">Todos</option>
                {TIPOS_PESSOA.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fornecedores…
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {fornecedores.length === 0
              ? "Nenhum fornecedor registrado até o momento."
              : "Nenhum fornecedor encontrado com os filtros selecionados."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabela (desktop) */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Endereço</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedoresDaPagina.map((fornecedor) => {
                  const chave =
                    somenteDigitos(fornecedor.cnpj) ||
                    fornecedor.razao_social.trim().toLowerCase();
                  const contratos = contratosPorFornecedor[chave] ?? 0;
                  return (
                    <tr key={fornecedor.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{fornecedor.razao_social}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {fornecedor.nome_fantasia || "—"}
                          {fornecedor.natureza_social ? ` · ${fornecedor.natureza_social}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatarDocumento(fornecedor.cnpj)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs">{enderecoCompleto(fornecedor)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          CEP {formatarCep(fornecedor.cep)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {fornecedor.responsavel_nome && (
                          <p className="font-medium">{fornecedor.responsavel_nome}</p>
                        )}
                        {fornecedor.email && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {fornecedor.email}
                          </p>
                        )}
                        {fornecedor.telefone && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {fornecedor.telefone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={varianteStatusFornecedor(fornecedor.status)}>
                          {rotuloStatusFornecedor(fornecedor.status)}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contratos} contrato(s)
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Visualizar fornecedor ${fornecedor.razao_social}`}
                            title="Ver cadastro completo"
                            onClick={() => abrirEdicao(fornecedor)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {podeEditar && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar fornecedor ${fornecedor.razao_social}`}
                                title="Editar fornecedor"
                                onClick={() => abrirEdicao(fornecedor)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir fornecedor ${fornecedor.razao_social}`}
                                title="Excluir fornecedor"
                                className="text-destructive"
                                onClick={() => setExcluindo(fornecedor)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Cartões (mobile) */}
          <div className="space-y-3 md:hidden">
            {fornecedoresDaPagina.map((fornecedor) => {
              const chave =
                somenteDigitos(fornecedor.cnpj) ||
                fornecedor.razao_social.trim().toLowerCase();
              const contratos = contratosPorFornecedor[chave] ?? 0;
              return (
                <Card key={fornecedor.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{fornecedor.razao_social}</p>
                        <p className="text-sm text-muted-foreground">
                          {fornecedor.nome_fantasia || "—"}
                        </p>
                      </div>
                      <Badge variant={varianteStatusFornecedor(fornecedor.status)}>
                        {rotuloStatusFornecedor(fornecedor.status)}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Documento</dt>
                      <dd className="text-right">{formatarDocumento(fornecedor.cnpj)}</dd>
                      <dt className="text-muted-foreground">Endereço</dt>
                      <dd className="text-right">{enderecoCompleto(fornecedor)}</dd>
                      <dt className="text-muted-foreground">Responsável</dt>
                      <dd className="text-right">
                        {fornecedor.responsavel_nome || "—"}
                      </dd>
                      <dt className="text-muted-foreground">Telefone</dt>
                      <dd className="text-right">{fornecedor.telefone || "—"}</dd>
                      <dt className="text-muted-foreground">E-mail</dt>
                      <dd className="text-right">{fornecedor.email || "—"}</dd>
                      <dt className="text-muted-foreground">Contratos</dt>
                      <dd className="text-right">{contratos}</dd>
                    </dl>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => abrirEdicao(fornecedor)}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      {podeEditar && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => abrirEdicao(fornecedor)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            aria-label={`Excluir fornecedor ${fornecedor.razao_social}`}
                            onClick={() => setExcluindo(fornecedor)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Página {paginaAtual + 1} de {totalPaginas} · {filtrados.length}{" "}
                fornecedor(es)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anteriores
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual >= totalPaginas - 1}
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                >
                  Próximos
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        aberto={dialogoAberto}
        titulo={
          editando ? `Editar fornecedor ${editando.razao_social}` : "Novo fornecedor"
        }
        descricao="Cadastro individual: dados da empresa, endereço, contatos, responsável e dados bancários."
        aoFechar={() => setDialogoAberto(false)}
        rodape={
          <>
            <Button variant="outline" onClick={() => setDialogoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar fornecedor
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {erroFormulario && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{erroFormulario}</span>
            </div>
          )}

          <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-primary" />
              CNPJ
            </h3>
            <p className="text-xs text-muted-foreground">
              Informe o CNPJ e clique na lupa para buscar os dados da empresa
              automaticamente. Os campos preenchidos podem ser editados.
            </p>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  className="mt-1"
                  inputMode="numeric"
                  value={formulario.cnpj}
                  onChange={(evento) =>
                    alterar("cnpj", mascaraDocumento(evento.target.value))
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-7"
                title="Buscar dados pelo CNPJ"
                aria-label="Buscar dados pelo CNPJ"
                disabled={buscandoCnpj}
                onClick={() => void buscarDadosCnpj()}
              >
                {buscandoCnpj ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-primary" />
              Identificação
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="razao-social">Razão social *</Label>
                <Input
                  id="razao-social"
                  className="mt-1"
                  value={formulario.razao_social}
                  onChange={(evento) => alterar("razao_social", evento.target.value)}
                  placeholder="Nome completo da empresa"
                />
              </div>
              <div>
                <Label htmlFor="nome-fantasia">Nome fantasia</Label>
                <Input
                  id="nome-fantasia"
                  className="mt-1"
                  value={formulario.nome_fantasia}
                  onChange={(evento) => alterar("nome_fantasia", evento.target.value)}
                  placeholder="Como é conhecido no mercado"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="inscricao-estadual">Inscrição estadual</Label>
                <Input
                  id="inscricao-estadual"
                  className="mt-1"
                  value={formulario.inscricao_estadual}
                  onChange={(evento) =>
                    alterar("inscricao_estadual", evento.target.value)
                  }
                  placeholder="Número da IE"
                />
              </div>
              <div>
                <Label htmlFor="natureza-social">Natureza social</Label>
                <Select
                  id="natureza-social"
                  className="mt-1"
                  value={formulario.natureza_social}
                  onChange={(evento) => alterar("natureza_social", evento.target.value)}
                >
                  <option value="">Não informada</option>
                  {NATUREZAS_SOCIAIS.map((natureza) => (
                    <option key={natureza} value={natureza}>
                      {natureza}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="tipo-pessoa">Tipo de pessoa</Label>
                <Select
                  id="tipo-pessoa"
                  className="mt-1"
                  value={formulario.tipo_pessoa}
                  onChange={(evento) => alterar("tipo_pessoa", evento.target.value)}
                >
                  {TIPOS_PESSOA.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status-fornecedor">Status</Label>
                <Select
                  id="status-fornecedor"
                  className="mt-1"
                  value={formulario.status}
                  onChange={(evento) => alterar("status", evento.target.value)}
                >
                  {STATUS_FORNECEDOR.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Endereço</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  className="mt-1"
                  inputMode="numeric"
                  value={formulario.cep}
                  onChange={(evento) => alterar("cep", evento.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  className="mt-1"
                  value={formulario.logradouro}
                  onChange={(evento) => alterar("logradouro", evento.target.value)}
                  placeholder="Rua, avenida…"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="numero-endereco">Número</Label>
                <Input
                  id="numero-endereco"
                  className="mt-1"
                  value={formulario.numero}
                  onChange={(evento) => alterar("numero", evento.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  className="mt-1"
                  value={formulario.complemento}
                  onChange={(evento) => alterar("complemento", evento.target.value)}
                  placeholder="Sala, loja…"
                />
              </div>
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  className="mt-1"
                  value={formulario.bairro}
                  onChange={(evento) => alterar("bairro", evento.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  className="mt-1"
                  value={formulario.cidade}
                  onChange={(evento) => alterar("cidade", evento.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="uf">UF</Label>
                <Select
                  id="uf"
                  className="mt-1"
                  value={formulario.uf}
                  onChange={(evento) => alterar("uf", evento.target.value)}
                >
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Contato</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  className="mt-1"
                  value={formulario.telefone}
                  onChange={(evento) => alterar("telefone", evento.target.value)}
                  placeholder="(14) 0000-0000"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  className="mt-1"
                  type="email"
                  value={formulario.email}
                  onChange={(evento) => alterar("email", evento.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                className="mt-1"
                value={formulario.site}
                onChange={(evento) => alterar("site", evento.target.value)}
                placeholder="www.empresa.com.br"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Responsável</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="responsavel-nome">Nome</Label>
                <Input
                  id="responsavel-nome"
                  className="mt-1"
                  value={formulario.responsavel_nome}
                  onChange={(evento) => alterar("responsavel_nome", evento.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="responsavel-cargo">Cargo</Label>
                <Input
                  id="responsavel-cargo"
                  className="mt-1"
                  value={formulario.responsavel_cargo}
                  onChange={(evento) => alterar("responsavel_cargo", evento.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="responsavel-telefone">Telefone</Label>
                <Input
                  id="responsavel-telefone"
                  className="mt-1"
                  value={formulario.responsavel_telefone}
                  onChange={(evento) =>
                    alterar("responsavel_telefone", evento.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="responsavel-email">E-mail</Label>
                <Input
                  id="responsavel-email"
                  className="mt-1"
                  type="email"
                  value={formulario.responsavel_email}
                  onChange={(evento) =>
                    alterar("responsavel_email", evento.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Dados bancários</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  className="mt-1"
                  value={formulario.banco}
                  onChange={(evento) => alterar("banco", evento.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  className="mt-1"
                  value={formulario.agencia}
                  onChange={(evento) => alterar("agencia", evento.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="conta">Conta</Label>
                <Input
                  id="conta"
                  className="mt-1"
                  value={formulario.conta}
                  onChange={(evento) => alterar("conta", evento.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Observações</h3>
            <Textarea
              id="observacoes"
              value={formulario.observacoes}
              onChange={(evento) => alterar("observacoes", evento.target.value)}
              placeholder="Informações adicionais sobre o fornecedor"
            />
          </section>
        </div>
      </Dialog>

      <Dialog
        aberto={Boolean(excluindo)}
        titulo="Excluir fornecedor"
        descricao={
          excluindo
            ? `O fornecedor ${excluindo.razao_social} será removido permanentemente. Esta ação não pode ser desfeita.`
            : undefined
        }
        aoFechar={() => setExcluindo(null)}
        largura="max-w-md"
        rodape={
          <>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmarExclusao()}
              disabled={processandoExclusao}
            >
              {processandoExclusao && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Prefira manter o registro e alterar o status para &quot;inativo&quot; quando o fornecedor
          não participar mais de licitações, preservando o histórico dos contratos.
        </p>
      </Dialog>
    </div>
  );
}
