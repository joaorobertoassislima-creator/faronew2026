import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface DadosDocumentoItem {
  /** ID PCA no PNCP. */
  idPca: string;
  /** Data de publicação do catálogo no PNCP. */
  dataPublicacao: string;
  /** ID do item no PCA (PNCP do item específico). */
  idItemPncp: string;
  /** Descrição do item específico (nível 2). */
  descricaoEspecifico: string;
  /** Código da classe/grupo (nível 3). */
  codigoClasse: string;
  /** Descrição da classe/grupo (nível 3). */
  descricaoClasse: string;
  /** ID do Documento de Formalização de Demanda Aprovado. */
  idDocumentoDemanda: string;
  /** Valor total do catálogo informado. */
  valorEspecifico: string;
}

interface ModalDocumentoItemProps {
  aberto: boolean;
  dados: DadosDocumentoItem | null;
  aoFechar: () => void;
}

/**
 * Modal "Documento do Item - Copiar/Colar".
 *
 * Mostra o texto gerado para o item (nível 3 - classe/grupo) em um bloco
 * editável: o usuário pode selecionar tudo, copiar com Ctrl+C ou usar o
 * botão "Copiar". O conteúdo é copiado como HTML, de forma que a
 * formatação (negrito dos rótulos) seja mantida ao colar no Word.
 */
export default function ModalDocumentoItem({
  aberto,
  dados,
  aoFechar,
}: ModalDocumentoItemProps) {
  const [copiado, setCopiado] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  if (!dados) return null;

  const linhas = [
    {
      rotulo: "I) ID PCA no PNCP:",
      valor: dados.idPca,
    },
    {
      rotulo: "II) Data de publicação no PNCP:",
      valor: dados.dataPublicacao,
    },
    {
      rotulo: "III) Id do item no PCA:",
      valor: `${dados.idItemPncp} – ${dados.descricaoEspecifico}`,
    },
    {
      rotulo: "IV) Classe/Grupo:",
      valor: `${dados.codigoClasse} - ${dados.descricaoClasse}`,
    },
    {
      rotulo: "V) ID do Documento de Formalização de Demanda Aprovado:",
      valor: dados.idDocumentoDemanda,
    },
    {
      rotulo: "VI) Valor Total do Catálogo Informado:",
      valor: dados.valorEspecifico,
    },
  ];

  /** Seleciona o conteúdo do documento para permitir a cópia manual. */
  function selecionarConteudo() {
    const area = areaRef.current;
    if (!area) return;
    const selecao = window.getSelection();
    if (!selecao) return;
    const intervalo = document.createRange();
    intervalo.selectNodeContents(area);
    selecao.removeAllRanges();
    selecao.addRange(intervalo);
  }

  /** Copia o documento preservando a formatação (HTML + texto puro). */
  async function copiar() {
    const area = areaRef.current;
    if (!area) return;

    const html = area.innerHTML;
    const texto = area.innerText;

    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([texto], { type: "text/plain" }),
          }),
        ]);
      } else {
        selecionarConteudo();
        document.execCommand("copy");
      }
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: mantém a seleção para Ctrl+C.
      selecionarConteudo();
    }
  }

  return (
    <Dialog
      aberto={aberto}
      titulo="Documento do Item - Copiar/Colar"
      descricao='Selecione o texto abaixo e copie (Ctrl+C) ou clique no botão "Copiar". A formatação será mantida ao colar no Word.'
      aoFechar={aoFechar}
      largura="max-w-2xl"
      rodape={
        <>
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
          <Button onClick={copiar}>
            {copiado ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiado ? "Copiado!" : "Copiar"}
          </Button>
        </>
      }
    >
      <div
        ref={areaRef}
        contentEditable
        suppressContentEditableWarning
        className="rounded-md border border-border bg-background p-5 font-sans text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {linhas.map((linha) => (
          <p key={linha.rotulo} className="mb-2 last:mb-0">
            <strong className="whitespace-nowrap">{linha.rotulo}</strong>{" "}
            {linha.valor}
          </p>
        ))}
      </div>
    </Dialog>
  );
}
