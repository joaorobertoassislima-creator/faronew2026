import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAPEIS, type Papel } from "@/lib/auth";
import {
  ROTULOS_PAPEIS,
  type DepartamentoSimples,
  type UsuarioSistema,
} from "@/lib/usuarios";

export interface FormularioUsuario {
  nome: string;
  email: string;
  senha: string;
  matricula: string;
  cargo: string;
  setor: string;
  telefone: string;
  departamento_id: string;
  papeis: Papel[];
  ativo: boolean;
}

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: FormularioUsuario) => Promise<string | null>;
  usuario: UsuarioSistema | null;
  departamentos: DepartamentoSimples[];
}

const FORMULARIO_VAZIO: FormularioUsuario = {
  nome: "",
  email: "",
  senha: "",
  matricula: "",
  cargo: "",
  setor: "",
  telefone: "",
  departamento_id: "",
  papeis: [],
  ativo: true,
};

export default function ModalUsuario({
  aberto,
  aoFechar,
  aoSalvar,
  usuario,
  departamentos,
}: Props) {
  const editando = usuario !== null;
  const [formulario, setFormulario] = useState<FormularioUsuario>(FORMULARIO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setEnviando(false);
    setFormulario(
      usuario
        ? {
            nome: usuario.nome ?? "",
            email: usuario.email ?? "",
            senha: "",
            matricula: usuario.matricula ?? "",
            cargo: usuario.cargo ?? "",
            setor: usuario.setor ?? "",
            telefone: usuario.telefone ?? "",
            departamento_id: usuario.departamento_id ?? "",
            papeis: usuario.papeis ?? [],
            ativo: usuario.ativo,
          }
        : FORMULARIO_VAZIO,
    );
  }, [aberto, usuario]);

  function atualizar(campo: keyof FormularioUsuario, valor: string | boolean | Papel[]) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternarPapel(papel: Papel) {
    setFormulario((atual) => ({
      ...atual,
      papeis: atual.papeis.includes(papel)
        ? atual.papeis.filter((item) => item !== papel)
        : [...atual.papeis, papel],
    }));
  }

  async function confirmar() {
    if (!formulario.nome.trim()) {
      setErro("Informe o nome do usuário.");
      return;
    }
    if (!editando) {
      if (!formulario.email.trim().includes("@")) {
        setErro("Informe um e-mail válido.");
        return;
      }
      if (formulario.senha.length < 8) {
        setErro("A senha deve ter no mínimo 8 caracteres.");
        return;
      }
    }
    if (formulario.papeis.length === 0) {
      setErro("Selecione ao menos um papel de acesso.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const problema = await aoSalvar(formulario);
      if (problema) {
        setErro(problema);
        setEnviando(false);
      }
    } catch (problema) {
      setErro(
        problema instanceof Error ? problema.message : "Não foi possível salvar o usuário.",
      );
      setEnviando(false);
    }
  }

  return (
    <Dialog
      aberto={aberto}
      titulo={editando ? "Editar usuário" : "Novo usuário"}
      descricao={
        editando
          ? "Atualize os dados cadastrais e os papéis de acesso."
          : "Cadastre um novo acesso ao SisPatri."
      }
      aoFechar={aoFechar}
      largura="max-w-2xl"
      rodape={
        <>
          <Button variant="outline" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {editando ? "Salvar alterações" : "Criar usuário"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usuario-nome">Nome completo</Label>
            <Input
              id="usuario-nome"
              value={formulario.nome}
              onChange={(evento) => atualizar("nome", evento.target.value)}
              placeholder="Ex.: Maria Souza"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-email">E-mail</Label>
            <Input
              id="usuario-email"
              type="email"
              value={formulario.email}
              disabled={editando}
              onChange={(evento) => atualizar("email", evento.target.value)}
              placeholder="nome@organizacao.gov.br"
            />
            {editando && (
              <p className="text-xs text-muted-foreground">
                O e-mail de acesso não pode ser alterado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-senha">
              {editando ? "Nova senha (opcional)" : "Senha de acesso"}
            </Label>
            <Input
              id="usuario-senha"
              type="password"
              value={formulario.senha}
              onChange={(evento) => atualizar("senha", evento.target.value)}
              placeholder={editando ? "Deixe em branco para manter" : "Mínimo de 8 caracteres"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-matricula">Matrícula</Label>
            <Input
              id="usuario-matricula"
              value={formulario.matricula}
              onChange={(evento) => atualizar("matricula", evento.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-cargo">Cargo</Label>
            <Input
              id="usuario-cargo"
              value={formulario.cargo}
              onChange={(evento) => atualizar("cargo", evento.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-setor">Setor</Label>
            <Input
              id="usuario-setor"
              value={formulario.setor}
              onChange={(evento) => atualizar("setor", evento.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usuario-telefone">Telefone</Label>
            <Input
              id="usuario-telefone"
              value={formulario.telefone}
              onChange={(evento) => atualizar("telefone", evento.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usuario-departamento">Departamento</Label>
            <Select
              id="usuario-departamento"
              value={formulario.departamento_id}
              onChange={(evento) => atualizar("departamento_id", evento.target.value)}
            >
              <option value="">Sem vínculo</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>
                  {departamento.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Papéis de acesso</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAPEIS.map((papel) => {
              const marcado = formulario.papeis.includes(papel);
              return (
                <label
                  key={papel}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition-colors ${
                    marcado
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={marcado}
                    onChange={() => alternarPapel(papel)}
                  />
                  <span className="leading-tight">
                    <span className="block font-medium">{ROTULOS_PAPEIS[papel]}</span>
                    <span className="block text-xs text-muted-foreground">{papel}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {!editando && (
          <div className="space-y-1.5">
            <Label htmlFor="usuario-ativo">Situação do acesso</Label>
            <Select
              id="usuario-ativo"
              value={formulario.ativo ? "ativo" : "inativo"}
              onChange={(evento) => atualizar("ativo", evento.target.value === "ativo")}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
        )}

        {erro && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
    </Dialog>
  );
}
