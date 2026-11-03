import { displayDate, professionalAreas, professionalDocumentFooter, professionalName, type DocumentContent } from "@/lib/admin/documents";
import type { DocumentLine, DocumentPage } from "@/lib/admin/document-layout";

const navy = "#172d45";
const teal = "#26796e";
const muted = "#596675";
const pale = "#cbd5dc";
const pageWidth = 595;
const left = 48;
const right = 547;
const contentWidth = right - left;

function measure(text: string, size: number, bold: boolean) {
  if (typeof document === "undefined") return text.length * size * 0.52;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * size * 0.52;
  context.font = `${bold ? "600" : "400"} ${size}px Arial`;
  return context.measureText(text).width;
}

function wrapText(text: string, size: number, bold: boolean, maxWidth: number) {
  if (typeof document === "undefined") return text.split(/\r?\n/);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.split(/\r?\n/);
  context.font = `${bold ? "600" : "400"} ${size}px Arial`;
  return text.replace(/\r/g, "").split("\n").flatMap((paragraph) => {
    if (!paragraph) return [""];
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (context.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}

function line(text: string, x: number, y: number, size: number, options: Partial<DocumentLine> = {}): DocumentLine {
  return { text, x, y, size, ...options };
}

export function layoutMedicalPrescription(content: DocumentContent, draft = false): DocumentPage[] {
  const pages: DocumentPage[] = [];
  let page: DocumentPage = [];
  let y = 0;

  function newPage() {
    page = [];
    const identity = professionalAreas.biomedicina;
    page.push(
      line(professionalName, 48, 58, 15, { bold: true, color: navy }),
      line(`${identity.title}  |  ${identity.registration}`, 48, 77, 9, { bold: true, color: teal }),
      line("RECEITUÁRIO", 48, 126, 18, { bold: true, color: navy }),
      { text: "", x: left, y: 140, size: 1, kind: "rule", width: contentWidth, color: teal },
    );
    if (draft) page.push(line("RASCUNHO · NÃO FINALIZADO", right - 154, 58, 7.5, { bold: true, color: muted }));
    pages.push(page);
    y = 172;
  }

  function addText(text: string, options: { size?: number; bold?: boolean; color?: string; indent?: number; gap?: number } = {}) {
    const size = options.size ?? 10;
    const bold = options.bold ?? false;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.55;
    const wrapped = wrapText(text, size, bold, contentWidth - indent);
    for (const part of wrapped) {
      if (y + lineHeight > 710) newPage();
      page.push(line(part, left + indent, y, size, { bold, color: options.color ?? navy }));
      y += lineHeight;
    }
    y += options.gap ?? 0;
  }

  function addField(label: string, value: string, x: number, yPosition: number, width: number) {
    page.push(line(label.toUpperCase(), x, yPosition, 7.5, { bold: true, color: muted }));
    page.push(line(value || "—", x, yPosition + 17, 10, { color: navy }));
    page.push({ text: "", x, y: yPosition + 23, size: 1, kind: "rule", width, color: pale });
  }

  newPage();
  page.push(line("DADOS DO PACIENTE", left, 160, 8, { bold: true, color: teal }));
  addField("Nome completo", content.patient.name, left, 178, contentWidth);
  addField("CPF / documento", content.patient.cpf, left, 225, 238);
  addField("Data de nascimento", displayDate(content.patient.birthDate), 310, 225, 237);
  addField("Data do atendimento", displayDate(content.patient.date), left, 272, contentWidth);
  y = 323;

  addText("PRESCRIÇÃO / ORIENTAÇÕES", { size: 8, bold: true, color: teal, gap: 10 });
  const items = content.mode === "free" && content.text.trim()
    ? [{ product: "", presentation: "", concentration: "", quantity: "", route: "", dosage: content.text, duration: "", notes: "" }]
    : content.items;

  if (!items.length) {
    for (let row = 0; row < 9; row += 1) {
      if (y + 30 > 710) newPage();
      page.push({ text: "", x: left, y: y + 25, size: 1, kind: "rule", width: contentWidth, color: pale });
      y += 38;
    }
  } else {
    items.forEach((item, index) => {
      const fields = [
        ["Produto / medicamento", item.product],
        ["Concentração / apresentação", [item.concentration, item.presentation].filter(Boolean).join(" · ")],
        ["Posologia / frequência", item.dosage],
        ["Via de administração", item.route],
        ["Duração", item.duration],
        ["Quantidade", item.quantity],
        ["Recomendações / observações", item.notes],
      ].filter(([, value]) => Boolean(value.trim()));
      const blockLines = fields.flatMap(([label, value]) => {
        const boldLabel = `${label}:`;
        const labelWidth = measure(boldLabel, 9, true) + 5;
        const valueLines = wrapText(value, 9, false, contentWidth - labelWidth);
        return valueLines.map((valueLine, lineIndex) => ({ label: lineIndex === 0 ? boldLabel : "", value: valueLine, labelWidth }));
      });
      const blockHeight = Math.max(25, blockLines.length * 14) + 13;
      if (y + blockHeight > 700 && y > 340) newPage();
      addText(`${String(index + 1).padStart(2, "0")}  ${item.product || "Prescrição"}`, { size: 9.5, bold: true, color: navy, gap: 5 });
      for (const entry of blockLines) {
        if (y + 14 > 710) newPage();
        if (entry.label) page.push(line(entry.label, left + 10, y, 9, { bold: true, color: muted }));
        page.push(line(entry.value, left + 10 + (entry.label ? entry.labelWidth : 0), y, 9, { color: navy }));
        y += 14;
      }
      y += 12;
      page.push({ text: "", x: left, y, size: 1, kind: "rule", width: contentWidth, color: pale });
      y += 9;
    });
  }

  if (content.guidance.trim()) {
    addText("RECOMENDAÇÕES ADICIONAIS", { size: 8, bold: true, color: teal, gap: 5 });
    addText(content.guidance, { size: 9, gap: 8 });
  }

  if (y + 86 > 710) newPage();
  y = Math.max(y + 22, 654);
  page.push(
    line(`Local: Juiz de Fora – MG     Data: ${displayDate(content.patient.date)}`, left, y, 8.5, { color: muted }),
    { text: "", x: 337, y: y + 49, size: 1, kind: "rule", width: 210, color: navy },
    line(professionalName, 337, y + 64, 8.5, { bold: true, color: navy }),
    line("Assinatura e carimbo profissional", 337, y + 77, 7.5, { color: muted }),
  );

  const contactLines = professionalDocumentFooter.split("\n").filter((text) => /telefone:|juiz de fora|drfredmartins\.com\.br/i.test(text));
  const footer = [professionalName, "CRBM 30421", ...contactLines];
  pages.forEach((currentPage, index) => {
    currentPage.push({ text: "", x: left, y: 766, size: 1, kind: "rule", width: contentWidth, color: pale });
    footer.forEach((text, footerIndex) => currentPage.push(line(text, left, 784 + footerIndex * 10, 7, { color: muted })));
    const pageText = `Página ${index + 1} de ${pages.length}`;
    currentPage.push(line(pageText, right - measure(pageText, 7, false), 820, 7, { color: muted }));
  });
  return pages;
}
