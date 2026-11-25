import { useCallback, useEffect, useMemo, useState } from "react";

/** Máscara de valor em reais (1.234,56) aplicada enquanto o usuário digita. */
function mascaraValor(texto: string): string {
  const digitos = texto.replace(/\D/g, "").slice(0, 13);
  if (digitos.length === 0) return "";
  const inteiro = digitos.slice(0, Math.max(digitos.length - 2, 1));
  const centavos = digitos.length > 2 ? digitos.slice(-2) : "";
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return centavos ? `${inteiroFormatado},${centavos}` : inteiroFormatado;
}
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import ModalPesquisaContrato from "@/components/pca/ModalPesquisaContrato";
import {
  formatarMoedaPCA,
  formatarQuantidadePCA,
  proximoCodigoItemContrato,
  type CatalogoPCA,
  type ClassePCA,
  type ItemContratoPCA,
  type ItemEspecificoPCA,
  type ItemGeralPCA,
} from "@/lib/pca";
import { type Contrato } from "@/lib/contratos";

interface FormularioGeral {
  id: string | null;
  codigo: string;
  descricao: string;
}

interface FormularioEspecifico {
  id: string | null;
  item_geral_id: string;
  codigo: string;
  descricao: string;
  id_pncp: string;
  id_documento_demanda: string;
}

/** Formulário do nível 4 - item código contrato. */
interface FormularioItemContrato {
  id: string | null;
  classe_id: string;
  codigo: string;
  descricao: string;
  contrato_id: string | null;
}

interface FormularioClasse {
  id: string | null;
  item_especifico_id: string;
  codigo: string;
  descricao: string;
  valor: string;
  quantidade: string;
  unidade_medida: string;
  especificacao: string;
  justificativa: string;
  observacoes: string;
}

/** Próximo código de item geral no formato X.00.00. */
function proximoCodigoGeral(codigos: string[]): string {
  const numeros = codigos
    .map((codigo) => Number(codigo.split(".")[0]))
    .filter((numero) => Number.isFinite(numero));
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${String(proximo).padStart(2, "0")}.00.00`;
}

/** Próximo código de item específico no formato X.YY.00 dentro do item geral. */
function proximoCodigoEspecifico(codigos: string[], prefixoGeral: string): string {
  const numeros = codigos
    .filter((codigo) => codigo.startsWith(prefixoGeral))
    .map((codigo) => Number(codigo.split(".")[1]))
    .filter((numero) => Number.isFinite(numero));
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${prefixoGeral}.${String(proximo).padStart(2, "0")}.00`;
}

/** Próximo código de classe no formato X.YY.ZZ dentro do item específico. */
function proximoCodigoClasse(codigos: string[], prefixoEspecifico: string): string {
  const numeros = codigos
    .filter((codigo) => codigo.startsWith(prefixoEspecifico))
    .map((codigo) => Number(codigo.split(".")[2]))
    .filter((numero) => Number.isFinite(numero));
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${prefixoEspecifico}.${String(proximo).padStart(2, "0")}`;
}

const GERAL_VAZIO: FormularioGeral = { id: null, codigo: "", descricao: "" };
const ESPECIFICO_VAZIO: FormularioEspecifico = {
  id: null,
  item_geral_id: "",
  codigo: "",
  descricao: "",
  id_pncp: "",
  id_documento_demanda: "",
};
const ITEM_CONTRATO_VAZIO: FormularioItemContrato = {
  id: null,
  classe_id: "",
  codigo: "",
  descricao: "",
  contrato_id: null,
};
const CLASSE_VAZIA: FormularioClasse = {
  id: null,
  item_especifico_id: "",
  codigo: "",
  descricao: "",
  valor: "",
  quantidade: "",
  unidade_medida: "",
  especificacao: "",
  justificativa: "",
  observacoes: "",
};

export default function PCAItens() {
  const { catalogoId } = useParams();
  const navegar = useNavigate();
  const { papeis } = useAuth();
  const { toast } = useToast();
  const podeEditar =
    papeis.includes("administrador") || papeis.includes("agente_compras");

  const [catalogo, setCatalogo] = useState<CatalogoPCA | null>(null);
  const [gerais, setGerais] = useState<ItemGeralPCA[]>([]);
  const [especificos, setEspecificos] = useState<ItemEspecificoPCA[]>([]);
  const [classes, setClasses] = useState<ClassePCA[]>([]);
  const [itensContrato, setItensContrato] = useState<ItemContratoPCA[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const [dialogo, setDialogo] = useState<
    | { tipo: "geral"; dados: FormularioGeral }
    | { tipo: "especifico"; dados: FormularioEspecifico }
    | { tipo: "classe"; dados: FormularioClasse }
    | { tipo: "itemContrato"; dados: FormularioItemContrato }
    | null
  >(null);
  const [vinculando, setVinculando] = useState<ItemContratoPCA | null>(null);
  /** Pesquisa de contrato aberta a partir do formulário do nível 4. */
  const [pesquisandoContrato, setPesquisandoContrato] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<{
    tipo: "geral" | "especifico" | "classe" | "itemContrato";
    id: string;
    descricao: string;
  } | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const carregar = useCallback(async () => {
    if (!catalogoId) return;
    setCarregando(true);
    setErro(null);

    const [
      catalogoRes,
      geraisRes,
      especificosRes,
      classesRes,
      itensContratoRes,
      contratosRes,
    ] = await Promise.all([
      supabase.from("pca_catalogos").select("*").eq("id", catalogoId).maybeSingle(),
      supabase
        .from("pca_itens_gerais")
        .select("*")
        .eq("catalogo_id", catalogoId)
        .order("codigo"),
      supabase
        .from("pca_itens_especificos")
        .select("*")
        .eq("catalogo_id", catalogoId)
        .order("codigo"),
      supabase
        .from("pca_classes")
        .select("*")
        .eq("catalogo_id", catalogoId)
        .order("codigo"),
      supabase
        .from("pca_itens_contrato")
        .select("*")
        .eq("catalogo_id", catalogoId)
        .order("codigo"),
      supabase.from("contratos").select("*").order("numero").limit(500),
    ]);

    if (catalogoRes.error) {
      const mensagem = traduzirErroSupabase(catalogoRes.error.message);
      setErro(mensagem);
      toast(mensagem, "erro");
      setCarregando(false);
      return;
    }

    setCatalogo((catalogoRes.data as CatalogoPCA) ?? null);
    setGerais((geraisRes.data as ItemGeralPCA[]) ?? []);
    setEspecificos((especificosRes.data as ItemEspecificoPCA[]) ?? []);
    setClasses((classesRes.data as ClassePCA[]) ?? []);
    setItensContrato((itensContratoRes.data as ItemContratoPCA[]) ?? []);
    setContratos((contratosRes.data as Contrato[]) ?? []);
    setCarregando(false);
  }, [catalogoId, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const termo = busca.trim().toLowerCase();

  const especificosPorGeral = useMemo(() => {
    const mapa: Record<string, ItemEspecificoPCA[]> = {};
    for (const item of especificos) {
      (mapa[item.item_geral_id] ??= []).push(item);
    }
    return mapa;
  }, [especificos]);

  const classesPorEspecifico = useMemo(() => {
    const mapa: Record<string, ClassePCA[]> = {};
    for (const item of classes) {
      (mapa[item.item_especifico_id] ??= []).push(item);
    }
    return mapa;
  }, [classes]);

  /** Nível 4 - itens código contrato agrupados por classe/grupo. */
  const itensContratoPorClasse = useMemo(() => {
    const mapa: Record<string, ItemContratoPCA[]> = {};
    for (const item of itensContrato) {
      (mapa[item.classe_id] ??= []).push(item);
    }
    return mapa;
  }, [itensContrato]);

  const contratosPorId = useMemo(() => {
    const mapa: Record<string, Contrato> = {};
    for (const contrato of contratos) mapa[contrato.id] = contrato;
    return mapa;
  }, [contratos]);

  const filtrados = useMemo(() => {
    if (!termo) return gerais;
    return gerais.filter((geral) => {
      const especificosDoGeral = especificosPorGeral[geral.id] ?? [];
      const classesDoGeral = especificosDoGeral.flatMap(
        (esp) => classesPorEspecifico[esp.id] ?? [],
      );
      const alvo = [
        geral.codigo,
        geral.descricao,
        ...especificosDoGeral.flatMap((esp) => [
          esp.codigo,
          esp.descricao,
          esp.id_pncp ?? "",
          esp.id_documento_demanda ?? "",
        ]),
        ...classesDoGeral.flatMap((cls) => [cls.codigo, cls.descricao]),
      ]
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [gerais, especificosPorGeral, classesPorEspecifico, termo]);

  const totais = useMemo(() => {
    let valor = 0;
    for (const item of classes) valor += Number(item.valor ?? 0);
    return {
      gerais: gerais.length,
      especificos: especificos.length,
      classes: classes.length,
      valor,
    };
  }, [gerais, especificos, classes]);

  function alternar(id: string) {
    setExpandidos((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  function abrirGeral(geral?: ItemGeralPCA) {
    setErroFormulario(null);
    setDialogo({
      tipo: "geral",
      dados: geral
        ? { id: geral.id, codigo: geral.codigo, descricao: geral.descricao }
        : {
            ...GERAL_VAZIO,
            codigo: proximoCodigoGeral(gerais.map((item) => item.codigo)),
          },
    });
  }

  function abrirEspecifico(
    itemGeralId: string,
    especifico?: ItemEspecificoPCA,
  ) {
    setErroFormulario(null);
    const codigosPais = (especificosPorGeral[itemGeralId] ?? []).map(
      (item) => item.codigo,
    );
    const geral = gerais.find((item) => item.id === itemGeralId);
    const prefixoGeral = geral?.codigo.split(".").slice(0, 1).join(".") ?? "01";
    setDialogo({
      tipo: "especifico",
      dados: especifico
        ? {
            id: especifico.id,
            item_geral_id: especifico.item_geral_id,
            codigo: especifico.codigo,
            descricao: especifico.descricao,
            id_pncp: especifico.id_pncp ?? "",
            id_documento_demanda: especifico.id_documento_demanda ?? "",
          }
        : {
            ...ESPECIFICO_VAZIO,
            item_geral_id: itemGeralId,
            codigo: proximoCodigoEspecifico(codigosPais, prefixoGeral),
          },
    });
  }

  function abrirClasse(
    itemEspecificoId: string,
    classe?: ClassePCA,
  ) {
    setErroFormulario(null);
    const codigosPais = (classesPorEspecifico[itemEspecificoId] ?? []).map(
      (item) => item.codigo,
    );
    const especifico = especificos.find(
      (item) => item.id === itemEspecificoId,
    );
    const prefixoEspecifico =
      especifico?.codigo.split(".").slice(0, 2).join(".") ?? "01.01";
    setDialogo({
      tipo: "classe",
      dados: classe
        ? {
            id: classe.id,
            item_especifico_id: classe.item_especifico_id,
            codigo: classe.codigo,
            descricao: classe.descricao,
            valor: String(classe.valor ?? ""),
            quantidade: classe.quantidade === null ? "" : String(classe.quantidade),
            unidade_medida: classe.unidade_medida ?? "",
            especificacao: classe.especificacao ?? "",
            justificativa: classe.justificativa ?? "",
            observacoes: classe.observacoes ?? "",
          }
        : {
            ...CLASSE_VAZIA,
            item_especifico_id: itemEspecificoId,
            codigo: proximoCodigoClasse(codigosPais, prefixoEspecifico),
          },
    });
  }

  function abrirItemContrato(classeId: string, item?: ItemContratoPCA) {
    setErroFormulario(null);
    const codigosPais = (itensContratoPorClasse[classeId] ?? []).map(
      (item) => item.codigo,
    );
    const classe = classes.find((item) => item.id === classeId);
    const prefixoClasse = classe?.codigo ?? "";
    setDialogo({
      tipo: "itemContrato",
      dados: item
        ? {
            id: item.id,
            classe_id: item.classe_id,
            codigo: item.codigo,
            descricao: item.descricao,
            contrato_id: item.contrato_id,
          }
        : {
            ...ITEM_CONTRATO_VAZIO,
            classe_id: classeId,
            codigo: proximoCodigoItemContrato(codigosPais, prefixoClasse),
          },
    });
  }

  /** Abre a modal de pesquisa avançada de contratos para o item do nível 4. */
  function abrirVinculacao(item: ItemContratoPCA) {
    setErroFormulario(null);
    setVinculando(item);
  }

  /** Grava o contrato escolhido na modal de pesquisa. */
  async function vincularContrato(contrato: Contrato) {
    if (!vinculando) return;
    setSalvando(true);
    const { error } = await supabase
      .from("pca_itens_contrato")
      .update({
        contrato_id: contrato.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", vinculando.id);
    setSalvando(false);
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
      return;
    }
    setVinculando(null);
    toast(`Contrato ${contrato.numero} vinculado ao item.`);
    await carregar();
  }

  /** Remove o vínculo do item com o contrato. */
  async function desvincularContrato(item: ItemContratoPCA) {
    setSalvando(true);
    const { error } = await supabase
      .from("pca_itens_contrato")
      .update({ contrato_id: null, atualizado_em: new Date().toISOString() })
      .eq("id", item.id);
    setSalvando(false);
    if (error) {
      toast(traduzirErroSupabase(error.message), "erro");
      return;
    }
    toast("Vínculo do contrato removido.");
    await carregar();
  }

  async function salvar() {
    if (!dialogo) return;
    setSalvando(true);
    setErroFormulario(null);

    let erro: string | null = null;

    if (dialogo.tipo === "geral") {
      const dados = dialogo.dados;
      if (!dados.codigo.trim()) erro = "Informe o código do item geral.";
      if (!dados.descricao.trim())
        erro = erro ?? "Informe a descrição do item geral.";
      if (erro) {
        setErroFormulario(erro);
        setSalvando(false);
        return;
      }
      const payload = {
        catalogo_id: catalogoId,
        codigo: dados.codigo.trim(),
        descricao: dados.descricao.trim(),
        atualizado_em: new Date().toISOString(),
      };
      const resultado = dados.id
        ? await supabase
            .from("pca_itens_gerais")
            .update(payload)
            .eq("id", dados.id)
        : await supabase.from("pca_itens_gerais").insert(payload);
      if (resultado.error) {
        const mensagem = traduzirErroSupabase(resultado.error.message);
        setErroFormulario(mensagem);
        toast(mensagem, "erro");
        setSalvando(false);
        return;
      }
    } else if (dialogo.tipo === "especifico") {
      const dados = dialogo.dados;
      if (!dados.item_geral_id)
        erro = "Selecione o item geral do item específico.";
      if (!dados.codigo.trim()) erro = erro ?? "Informe o código do item específico.";
      if (!dados.descricao.trim())
        erro = erro ?? "Informe a descrição do item específico.";
      if (erro) {
        setErroFormulario(erro);
        setSalvando(false);
        return;
      }
      const payload = {
        catalogo_id: catalogoId,
        item_geral_id: dados.item_geral_id,
        codigo: dados.codigo.trim(),
        descricao: dados.descricao.trim(),
        id_pncp: dados.id_pncp.trim() || null,
        id_documento_demanda: dados.id_documento_demanda.trim() || null,
        atualizado_em: new Date().toISOString(),
      };
      const resultado = dados.id
        ? await supabase
            .from("pca_itens_especificos")
            .update(payload)
            .eq("id", dados.id)
        : await supabase.from("pca_itens_especificos").insert(payload);
      if (resultado.error) {
        const mensagem = traduzirErroSupabase(resultado.error.message);
        setErroFormulario(mensagem);
        toast(mensagem, "erro");
        setSalvando(false);
        return;
      }
    } else if (dialogo.tipo === "classe") {
      const dados = dialogo.dados;
      if (!dados.item_especifico_id)
        erro = "Selecione o item específico da classe.";
      if (!dados.codigo.trim()) erro = erro ?? "Informe o código da classe.";
      if (!dados.descricao.trim())
        erro = erro ?? "Informe a descrição da classe.";
      const valor = Number(dados.valor.replace(",", "."));
      if (dados.valor.trim() && !Number.isFinite(valor))
        erro = erro ?? "Informe um valor válido para a classe.";
      if (erro) {
        setErroFormulario(erro);
        setSalvando(false);
        return;
      }
      const payload = {
        catalogo_id: catalogoId,
        item_especifico_id: dados.item_especifico_id,
        codigo: dados.codigo.trim(),
        descricao: dados.descricao.trim(),
        valor: Number.isFinite(valor) ? valor : 0,
        quantidade: dados.quantidade.trim()
          ? Number(dados.quantidade.replace(",", "."))
          : null,
        unidade_medida: dados.unidade_medida.trim() || null,
        especificacao: dados.especificacao.trim() || null,
        justificativa: dados.justificativa.trim() || null,
        observacoes: dados.observacoes.trim() || null,
        atualizado_em: new Date().toISOString(),
      };
      const resultado = dados.id
        ? await supabase.from("pca_classes").update(payload).eq("id", dados.id)
        : await supabase.from("pca_classes").insert(payload);
      if (resultado.error) {
        const mensagem = traduzirErroSupabase(resultado.error.message);
        setErroFormulario(mensagem);
        toast(mensagem, "erro");
        setSalvando(false);
        return;
      }
    } else {
      const dados = dialogo.dados;
      if (!dados.classe_id)
        erro = "Selecione a classe/grupo do item código contrato.";
      if (!dados.codigo.trim())
        erro = erro ?? "Informe o código do item código contrato.";
      if (!dados.descricao.trim())
        erro = erro ?? "Informe a descrição do item código contrato.";
      if (erro) {
        setErroFormulario(erro);
        setSalvando(false);
        return;
      }
      const payload = {
        catalogo_id: catalogoId,
        classe_id: dados.classe_id,
        codigo: dados.codigo.trim(),
        descricao: dados.descricao.trim(),
        contrato_id: dados.contrato_id,
        atualizado_em: new Date().toISOString(),
      };
      const resultado = dados.id
        ? await supabase
            .from("pca_itens_contrato")
            .update(payload)
            .eq("id", dados.id)
        : await supabase.from("pca_itens_contrato").insert(payload);
      if (resultado.error) {
        const mensagem = traduzirErroSupabase(resultado.error.message);
        setErroFormulario(mensagem);
        toast(mensagem, "erro");
        setSalvando(false);
        return;
      }
    }

    setSalvando(false);
    setDialogo(null);
    toast("Item do PCA salvo com sucesso.");
    await carregar();
    await recalcularValorCatalogo();
  }

  async function recalcularValorCatalogo() {
    if (!catalogoId) return;
    const { data } = await supabase
      .from("pca_classes")
      .select("valor")
      .eq("catalogo_id", catalogoId);
    const total = (data ?? []).reduce(
      (soma, item) => soma + Number((item as { valor: number }).valor ?? 0),
      0,
    );
    await supabase
      .from("pca_catalogos")
      .update({ valor_total: total, atualizado_em: new Date().toISOString() })
      .eq("id", catalogoId);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    let erro: { message: string } | null = null;

    if (excluindo.tipo === "geral") {
      const { data: especificosFilhos } = await supabase
        .from("pca_itens_especificos")
        .select("id")
        .eq("item_geral_id", excluindo.id);
      const ids = (especificosFilhos ?? []).map((item) => item.id as string);
      if (ids.length > 0) {
        const { data: classesFilhas } = await supabase
          .from("pca_classes")
          .select("id")
          .in("item_especifico_id", ids);
        const idsClasses = (classesFilhas ?? []).map(
          (item) => item.id as string,
        );
        if (idsClasses.length > 0) {
          const res = await supabase
            .from("pca_classes")
            .delete()
            .in("id", idsClasses);
          if (res.error) erro = res.error;
        }
      }
      if (!erro) {
        const res = await supabase
          .from("pca_itens_especificos")
          .delete()
          .eq("item_geral_id", excluindo.id);
        if (res.error) erro = res.error;
      }
      if (!erro) {
        const res = await supabase
          .from("pca_itens_gerais")
          .delete()
          .eq("id", excluindo.id);
        if (res.error) erro = res.error;
      }
    } else if (excluindo.tipo === "especifico") {
      const { data: classesFilhas } = await supabase
        .from("pca_classes")
        .select("id")
        .eq("item_especifico_id", excluindo.id);
      const idsClasses = (classesFilhas ?? []).map((item) => item.id as string);
      if (idsClasses.length > 0) {
        const res = await supabase
          .from("pca_classes")
          .delete()
          .in("id", idsClasses);
        if (res.error) erro = res.error;
      }
      if (!erro) {
        const res = await supabase
          .from("pca_itens_especificos")
          .delete()
          .eq("id", excluindo.id);
        if (res.error) erro = res.error;
      }
    } else if (excluindo.tipo === "classe") {
      const res = await supabase
        .from("pca_classes")
        .delete()
        .eq("id", excluindo.id);
      if (res.error) erro = res.error;
    } else {
      const res = await supabase
        .from("pca_itens_contrato")
        .delete()
        .eq("id", excluindo.id);
      if (res.error) erro = res.error;
    }

    setProcessandoExclusao(false);
    if (erro) {
      toast(traduzirErroSupabase(erro.message), "erro");
      return;
    }
    setExcluindo(null);
    toast("Item do PCA excluído com sucesso.");
    await carregar();
    await recalcularValorCatalogo();
  }

  const tituloDialogo =
    dialogo?.tipo === "geral"
      ? dialogo.dados.id
        ? "Editar item geral"
        : "Novo item geral"
      : dialogo?.tipo === "especifico"
        ? dialogo.dados.id
          ? "Editar item específico"
          : "Novo item específico"
        : dialogo?.tipo === "classe"
          ? dialogo.dados.id
            ? "Editar classe/grupo"
            : "Nova classe/grupo"
          : dialogo?.tipo === "itemContrato"
            ? dialogo.dados.id
              ? "Editar item código contrato"
              : "Novo item código contrato"
            : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/pca"
            className="-ml-2 mb-2 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para os catálogos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Itens do PCA
          </h1>
          <p className="text-sm text-muted-foreground">
            {catalogo
              ? `Catálogo ${catalogo.id_pncp} · exercício ${catalogo.exercicio}`
              : "Estrutura hierárquica de itens do Plano de Contratações Anual."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void carregar()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {podeEditar && (
            <Button variant="outline" asChild>
              <Link to={`/pca/${catalogoId}/importar`}>
                <Upload className="h-4 w-4" />
                Importar CSV
              </Link>
            </Button>
          )}
          {podeEditar && (
            <Button onClick={() => abrirGeral()}>
              <Plus className="h-4 w-4" />
              Novo item geral
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Itens gerais
            </p>
            <p className="mt-1 text-2xl font-semibold">{totais.gerais}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Itens específicos
            </p>
            <p className="mt-1 text-2xl font-semibold">{totais.especificos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Classes/grupos
            </p>
            <p className="mt-1 text-2xl font-semibold">{totais.classes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Valor total
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatarMoedaPCA(totais.valor)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código, descrição, ID PNCP ou ID Demanda"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>

          {erro && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando itens...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum item encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados.map((geral) => {
                const especificosDoGeral = especificosPorGeral[geral.id] ?? [];
                const classesDoGeral = especificosDoGeral.reduce(
                  (soma, esp) =>
                    soma + (classesPorEspecifico[esp.id] ?? []).length,
                  0,
                );
                const aberto = expandidos[geral.id] ?? true;
                return (
                  <div
                    key={geral.id}
                    className="rounded-md border border-border"
                  >
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => alternar(geral.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
                        aria-label={aberto ? "Recolher" : "Expandir"}
                      >
                        {aberto ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-primary">
                          {geral.codigo}
                        </p>
                        <p className="truncate text-sm">{geral.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {especificosDoGeral.length} específico(s) ·{" "}
                          {classesDoGeral} classe(s)
                        </p>
                      </div>
                      {podeEditar && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar item geral"
                            onClick={() => abrirGeral(geral)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            title="Excluir item geral"
                            onClick={() =>
                              setExcluindo({
                                tipo: "geral",
                                id: geral.id,
                                descricao: geral.descricao,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {aberto && (
                      <div className="space-y-2 border-t border-border p-3">
                        {especificosDoGeral.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhum item específico neste nível.
                          </p>
                        ) : (
                          especificosDoGeral.map((especifico) => {
                            const classesDoEspecifico =
                              classesPorEspecifico[especifico.id] ?? [];
                            const abertoEspecifico =
                              expandidos[especifico.id] ?? false;
                            return (
                              <div
                                key={especifico.id}
                                className="rounded-md border border-border bg-muted/30"
                              >
                                <div className="flex items-center gap-2 p-3">
                                  <button
                                    type="button"
                                    onClick={() => alternar(especifico.id)}
                                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
                                    aria-label={
                                      abertoEspecifico ? "Recolher" : "Expandir"
                                    }
                                  >
                                    {abertoEspecifico ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-mono text-sm font-semibold text-primary">
                                      {especifico.codigo}
                                    </p>
                                    <p className="truncate text-sm">
                                      {especifico.descricao}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      ID PNCP: {especifico.id_pncp || "—"} · ID
                                      Demanda:{" "}
                                      {especifico.id_documento_demanda || "—"}
                                    </p>
                                  </div>
                                  {podeEditar && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Adicionar classe"
                                        onClick={() =>
                                          abrirClasse(especifico.id)
                                        }
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Editar item específico"
                                        onClick={() =>
                                          abrirEspecifico(
                                            especifico.item_geral_id,
                                            especifico,
                                          )
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        title="Excluir item específico"
                                        onClick={() =>
                                          setExcluindo({
                                            tipo: "especifico",
                                            id: especifico.id,
                                            descricao: especifico.descricao,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {abertoEspecifico && (
                                  <div className="space-y-2 border-t border-border p-3">
                                    {classesDoEspecifico.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        Nenhuma classe/grupo neste nível.
                                      </p>
                                    ) : (
                                      classesDoEspecifico.map((classe) => (
                                        <div
                                          key={classe.id}
                                          className="rounded-md border border-border bg-card"
                                        >
                                          <div className="flex items-start gap-3 p-3">
                                            <div className="min-w-0 flex-1">
                                            <p className="font-mono text-sm font-semibold text-primary">
                                              {classe.codigo}
                                            </p>
                                            <p className="text-sm">
                                              {classe.descricao}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Quantidade:{" "}
                                              {formatarQuantidadePCA(
                                                classe.quantidade,
                                              )}{" "}
                                              {classe.unidade_medida ?? ""}
                                            </p>
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className="shrink-0 font-mono"
                                          >
                                            {formatarMoedaPCA(classe.valor)}
                                          </Badge>
                                          {podeEditar && (
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Adicionar item código contrato"
                                                onClick={() =>
                                                  abrirItemContrato(classe.id)
                                                }
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Editar classe"
                                                onClick={() =>
                                                  abrirClasse(
                                                    classe.item_especifico_id,
                                                    classe,
                                                  )
                                                }
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                title="Excluir classe"
                                                onClick={() =>
                                                  setExcluindo({
                                                    tipo: "classe",
                                                    id: classe.id,
                                                    descricao:
                                                      classe.descricao,
                                                  })
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                          </div>
                                          {(itensContratoPorClasse[classe.id] ??
                                            []).length > 0 && (
                                            <div className="space-y-2 border-t border-border p-3">
                                              {(itensContratoPorClasse[classe.id] ??
                                                []).map((item) => {
                                                  const contratoVinculado =
                                                    item.contrato_id
                                                      ? contratosPorId[
                                                          item.contrato_id
                                                        ]
                                                      : null;
                                                  return (
                                                    <div
                                                      key={item.id}
                                                      className="flex flex-wrap items-start gap-3 rounded-md border border-border bg-background p-3"
                                                    >
                                                      <div className="min-w-0 flex-1">
                                                        <p className="font-mono text-xs font-semibold text-primary">
                                                          {item.codigo}
                                                        </p>
                                                        <p className="text-sm">
                                                          {item.descricao}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                          Contrato:{" "}
                                                          {contratoVinculado
                                                            ? `${contratoVinculado.numero} · ${contratoVinculado.objeto}`
                                                            : "não vinculado"}
                                                        </p>
                                                      </div>
                                                      {podeEditar && (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          title="Vincular contrato"
                                                          onClick={() =>
                                                            abrirVinculacao(item)
                                                          }
                                                        >
                                                          <Link2 className="h-4 w-4" />
                                                          Vincular contrato
                                                        </Button>
                                                      )}
                                                      {podeEditar &&
                                                        contratoVinculado && (
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Remover vínculo do contrato"
                                                            onClick={() =>
                                                              void desvincularContrato(
                                                                item,
                                                              )
                                                            }
                                                          >
                                                            Desvincular
                                                          </Button>
                                                        )}
                                                      {podeEditar && (
                                                        <div className="flex items-center gap-1">
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Editar item código contrato"
                                                            onClick={() =>
                                                              abrirItemContrato(
                                                                classe.id,
                                                                item,
                                                              )
                                                            }
                                                          >
                                                            <Pencil className="h-4 w-4" />
                                                          </Button>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            title="Excluir item código contrato"
                                                            onClick={() =>
                                                              setExcluindo({
                                                                tipo: "itemContrato",
                                                                id: item.id,
                                                                descricao:
                                                                  item.descricao,
                                                              })
                                                            }
                                                          >
                                                            <Trash2 className="h-4 w-4" />
                                                          </Button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                        {podeEditar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirEspecifico(geral.id)}
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar item específico
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        aberto={dialogo !== null}
        titulo={tituloDialogo}
        descricao="Preencha os dados do item do PCA."
        aoFechar={() => setDialogo(null)}
        rodape={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {erroFormulario && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erroFormulario}
            </p>
          )}

          {dialogo?.tipo === "geral" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="geral_codigo">Código *</Label>
                <Input
                  id="geral_codigo"
                  value={dialogo.dados.codigo}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "geral",
                      dados: { ...dialogo.dados, codigo: evento.target.value },
                    })
                  }
                  placeholder="1.00.00"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="geral_descricao">Descrição *</Label>
                <Input
                  id="geral_descricao"
                  value={dialogo.dados.descricao}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "geral",
                      dados: {
                        ...dialogo.dados,
                        descricao: evento.target.value,
                      },
                    })
                  }
                  placeholder="Ex.: MATERIAL"
                />
              </div>
            </div>
          )}

          {dialogo?.tipo === "especifico" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="esp_geral">Item geral *</Label>
                <Select
                  id="esp_geral"
                  value={dialogo.dados.item_geral_id}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "especifico",
                      dados: {
                        ...dialogo.dados,
                        item_geral_id: evento.target.value,
                      },
                    })
                  }
                >
                  {gerais.map((geral) => (
                    <option key={geral.id} value={geral.id}>
                      {geral.codigo} - {geral.descricao}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="esp_codigo">Código *</Label>
                <Input
                  id="esp_codigo"
                  value={dialogo.dados.codigo}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "especifico",
                      dados: { ...dialogo.dados, codigo: evento.target.value },
                    })
                  }
                  placeholder="1.01.00"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="esp_descricao">Descrição *</Label>
                <Input
                  id="esp_descricao"
                  value={dialogo.dados.descricao}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "especifico",
                      dados: {
                        ...dialogo.dados,
                        descricao: evento.target.value,
                      },
                    })
                  }
                  placeholder="Ex.: MATERIAL DE LIMPEZA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esp_pncp">ID PNCP</Label>
                <Input
                  id="esp_pncp"
                  value={dialogo.dados.id_pncp}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "especifico",
                      dados: {
                        ...dialogo.dados,
                        id_pncp: evento.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esp_demanda">ID Documento da Demanda</Label>
                <Input
                  id="esp_demanda"
                  value={dialogo.dados.id_documento_demanda}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "especifico",
                      dados: {
                        ...dialogo.dados,
                        id_documento_demanda: evento.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {dialogo?.tipo === "classe" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cls_especifico">Item específico *</Label>
                <Select
                  id="cls_especifico"
                  value={dialogo.dados.item_especifico_id}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        item_especifico_id: evento.target.value,
                      },
                    })
                  }
                >
                  {especificos.map((especifico) => (
                    <option key={especifico.id} value={especifico.id}>
                      {especifico.codigo} - {especifico.descricao}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cls_codigo">Código *</Label>
                <Input
                  id="cls_codigo"
                  value={dialogo.dados.codigo}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: { ...dialogo.dados, codigo: evento.target.value },
                    })
                  }
                  placeholder="1.01.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cls_valor">Valor *</Label>
                <Input
                  id="cls_valor"
                  inputMode="decimal"
                  value={dialogo.dados.valor}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        valor: mascaraValor(evento.target.value),
                      },
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cls_descricao">Descrição *</Label>
                <Input
                  id="cls_descricao"
                  value={dialogo.dados.descricao}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        descricao: evento.target.value,
                      },
                    })
                  }
                  placeholder="Ex.: PRODUTOS DE LIMPEZA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cls_quantidade">Quantidade</Label>
                <Input
                  id="cls_quantidade"
                  inputMode="decimal"
                  value={dialogo.dados.quantidade}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        quantidade: evento.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cls_unidade">Unidade de medida</Label>
                <Input
                  id="cls_unidade"
                  value={dialogo.dados.unidade_medida}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        unidade_medida: evento.target.value,
                      },
                    })
                  }
                  placeholder="Ex.: UN, KG, CX"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cls_especificacao">Especificação</Label>
                <Textarea
                  id="cls_especificacao"
                  value={dialogo.dados.especificacao}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        especificacao: evento.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cls_justificativa">Justificativa</Label>
                <Textarea
                  id="cls_justificativa"
                  value={dialogo.dados.justificativa}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        justificativa: evento.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cls_observacoes">Observações</Label>
                <Textarea
                  id="cls_observacoes"
                  value={dialogo.dados.observacoes}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "classe",
                      dados: {
                        ...dialogo.dados,
                        observacoes: evento.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {dialogo?.tipo === "itemContrato" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="itemcontrato_classe">Classe/grupo *</Label>
                <Select
                  id="itemcontrato_classe"
                  value={dialogo.dados.classe_id}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "itemContrato",
                      dados: {
                        ...dialogo.dados,
                        classe_id: evento.target.value,
                      },
                    })
                  }
                >
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.codigo} - {classe.descricao}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemcontrato_codigo">Código *</Label>
                <Input
                  id="itemcontrato_codigo"
                  value={dialogo.dados.codigo}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "itemContrato",
                      dados: { ...dialogo.dados, codigo: evento.target.value },
                    })
                  }
                  placeholder="1.01.01.001"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="itemcontrato_descricao">Descrição *</Label>
                <Input
                  id="itemcontrato_descricao"
                  value={dialogo.dados.descricao}
                  onChange={(evento) =>
                    setDialogo({
                      tipo: "itemContrato",
                      dados: {
                        ...dialogo.dados,
                        descricao: evento.target.value,
                      },
                    })
                  }
                  placeholder="Ex.: Item 001 - Fornecedor do contrato"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="itemcontrato_contrato">Contrato vinculado</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="itemcontrato_contrato"
                      value={dialogo.dados.contrato_id ?? ""}
                      onChange={(evento) =>
                        setDialogo({
                          tipo: "itemContrato",
                          dados: {
                            ...dialogo.dados,
                            contrato_id: evento.target.value || null,
                          },
                        })
                      }
                    >
                      <option value="">Nenhum contrato vinculado</option>
                      {contratos.map((contrato) => (
                        <option key={contrato.id} value={contrato.id}>
                          {contrato.numero} · {contrato.objeto}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Pesquisar contrato"
                    aria-label="Pesquisar contrato"
                    onClick={() => setPesquisandoContrato(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique na lupa para escolher o contrato na tabela paginada
                  com filtros por coluna (o contrato fica vinculado ao item ao
                  salvar).
                </p>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        aberto={excluindo !== null}
        titulo="Excluir item do PCA"
        descricao="Os itens vinculados a este registro também serão removidos."
        aoFechar={() => setExcluindo(null)}
        rodape={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={processandoExclusao}
              onClick={() => void confirmarExclusao()}
            >
              {processandoExclusao && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          Confirma a exclusão de{" "}
          <strong>
            {excluindo?.tipo === "geral"
              ? "item geral"
              : excluindo?.tipo === "especifico"
                ? "item específico"
                : excluindo?.tipo === "classe"
                  ? "classe/grupo"
                  : "item código contrato"}
          </strong>{" "}
          <strong>{excluindo?.descricao}</strong>?
        </p>
      </Dialog>

      <ModalPesquisaContrato
        aberto={vinculando !== null || pesquisandoContrato}
        aoFechar={() => {
          setVinculando(null);
          setPesquisandoContrato(false);
        }}
        aoSelecionar={(contrato) => {
          if (vinculando) {
            void vincularContrato(contrato);
            return;
          }
          setDialogo((atual) =>
            atual && atual.tipo === "itemContrato"
              ? {
                  ...atual,
                  dados: { ...atual.dados, contrato_id: contrato.id },
                }
              : atual,
          );
        }}
        contratoSelecionadoId={
          vinculando?.contrato_id ??
          (dialogo && dialogo.tipo === "itemContrato"
            ? dialogo.dados.contrato_id
            : null)
        }
      />
    </div>
  );
}
