import type { MedicationRecord } from "@/lib/admin/types";
import type { DocumentPage, DocumentLine } from "@/lib/admin/document-layout";

export type MedicationReviewFlag = {
  label: string;
  tone: "amber" | "rose" | "slate" | "teal";
};

const observationSections = [
  "PARA QUE SERVE?",
  "PRINCIPAIS APLICAÇÕES",
  "MECANISMO DE AÇÃO",
  "CUIDADOS E CONTRAINDICAÇÕES",
] as const;

type ParsedObservation = {
  sections: Record<(typeof observationSections)[number] | "CONTEÚDO COMPLEMENTAR", string[]>;
  references: string[];
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

export function medicationReviewFlags(medication: MedicationRecord): MedicationReviewFlag[] {
  const name = normalized(medication.name);
  const flags: MedicationReviewFlag[] = [];
  const commercialNamePending = /\b(MASTEROM|TIZERC|DURA|ENATHATE)\b/.test(name);
  const possibleDuplicate = /\bMAGANES\b|\bMANGANES\s*20\s*MG\b/.test(name);
  const compositionConfirmed = /^STATUS INTERNO:\\s*COMPOSIÇÃO CONFIRMADA\\s*$/im.test(medication.notes ?? "");
  const hasReferences = Boolean(parseObservation(medication.notes ?? "").references.length);

  flags.push(compositionConfirmed
    ? { label: "Composição confirmada", tone: "teal" }
    : { label: "Composição pendente de confirmação", tone: "amber" });
  if (commercialNamePending) flags.push({ label: "Nome comercial pendente de identificação", tone: "rose" });
  if (possibleDuplicate) flags.push({ label: "Possível duplicidade cadastral", tone: "rose" });
  if (!hasReferences) flags.push({ label: "Informação técnica pendente de validação", tone: "slate" });
  return flags;
}

function parseObservation(notes: string): ParsedObservation {
  const sections: ParsedObservation["sections"] = {
    "PARA QUE SERVE?": [],
    "PRINCIPAIS APLICAÇÕES": [],
    "MECANISMO DE AÇÃO": [],
    "CUIDADOS E CONTRAINDICAÇÕES": [],
    "CONTEÚDO COMPLEMENTAR": [],
  };
  const references: string[] = [];
  let current: keyof ParsedObservation["sections"] | "REFERÊNCIAS TÉCNICAS" = "CONTEÚDO COMPLEMENTAR";

  for (const line of notes.split(/\r\n|\n|\r/)) {
    const heading = normalized(line);
    const section = observationSections.find((candidate) => normalized(candidate) === heading);
    if (section) {
      current = section;
      continue;
    }
    if (heading.startsWith("STATUS INTERNO:")) continue;
    if (heading === "REFERÊNCIAS TÉCNICAS") {
      current = "REFERÊNCIAS TÉCNICAS";
      continue;
    }
    if (current === "REFERÊNCIAS TÉCNICAS") {
      if (line.trim()) references.push(line.trim());
    } else if (line.trim()) {
      sections[current].push(line.trim());
    }
  }
  return { sections, references };
}

function measurementContext() {
  return typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
}

function wrapText(text: string, size: number, bold: boolean, maxWidth: number, context: CanvasRenderingContext2D | null) {
  if (!context) return text.split(/\r\n|\n|\r/).flatMap((line) => line.match(new RegExp(`.{1,${Math.max(1, Math.floor(maxWidth / (size * 0.52)))}(?:\\s|$)|\\S+`, "gu")) ?? [""]);
  context.font = `${bold ? "bold" : "normal"} ${size}px Helvetica`;
  return text.split(/\r\n|\n|\r/).flatMap((paragraph) => {
    if (!paragraph) return [""];
    const words = paragraph.match(/\s+|\S+/g) ?? [""];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (/^\s+$/.test(word) && !line) continue;
      if (context.measureText(line + word).width <= maxWidth) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
      for (const character of Array.from(word.trimStart())) {
        if (line && context.measureText(line + character).width > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  });
}

const palette = {
  purple: "#39245d",
  teal: "#26796e",
  muted: "#655a73",
  body: "#302a38",
  care: "#51404a",
  rule: "#e9e3f2",
};

function buildMedicationBlock(medication: MedicationRecord, index: number, fontSize: number, context: CanvasRenderingContext2D | null): DocumentLine[] {
  const parsed = parseObservation(medication.notes?.trim() || "Observação não informada.");
  const lines: DocumentLine[] = [];
  let y = 0;
  const addText = (text: string, x: number, size: number, bold: boolean, color: string, maxWidth: number, lineHeight: number) => {
    const wrapped = wrapText(text, size, bold, maxWidth, context);
    wrapped.forEach((line) => {
      lines.push({ text: line, x, y, size, bold, color });
      y += lineHeight;
    });
  };

  addText(`${index + 1}. ${medication.name}`, 50, 12, true, palette.purple, 495, 16);
  y += 2;
  const flags = medicationReviewFlags(medication);
  if (flags.length) {
    addText(`SITUAÇÃO INTERNA: ${flags.map((flag) => flag.label).join(" · ")}`, 56, Math.max(7.5, fontSize - 1), true, palette.muted, 475, Math.max(9, fontSize + 1));
    y += 3;
  }

  for (const heading of observationSections) {
    const body = parsed.sections[heading];
    if (!body.length) continue;
    y += 3;
    const headingColor = heading === "CUIDADOS E CONTRAINDICAÇÕES" ? palette.care : palette.teal;
    addText(heading, 56, fontSize, true, headingColor, 475, fontSize + 3);
    y += 1;
    for (const paragraph of body) {
      addText(paragraph, 64, fontSize, false, palette.body, 465, fontSize + 3);
      y += 2;
    }
  }
  const extra = parsed.sections["CONTEÚDO COMPLEMENTAR"];
  if (extra.length) {
    y += 3;
    addText("CONTEÚDO COMPLEMENTAR", 56, fontSize, true, palette.teal, 475, fontSize + 3);
    for (const paragraph of extra) {
      addText(paragraph, 64, fontSize, false, palette.body, 465, fontSize + 3);
      y += 2;
    }
  }
  y += 4;
  lines.push({ text: "", x: 50, y, size: 1, color: palette.rule, kind: "rule", width: 495 });
  y += 10;
  return lines.map((line) => ({ ...line, y: line.y + 148 }));
}

function wrapEntry(name: string, page: number, context: CanvasRenderingContext2D | null) {
  const lines = wrapText(name, 9.5, false, 425, context);
  return { name, page, lines, height: Math.max(22, lines.length * 12 + 5) };
}

export function medicationObservationPdfPages(medications: MedicationRecord[]): DocumentPage[] {
  const context = measurementContext();
  const date = new Date().toLocaleDateString("pt-BR");
  const reportPages: DocumentPage[] = [];
  const firstProductPages: number[] = [];
  let current: DocumentPage = [];
  let currentY = 0;
  const bodyTop = 148;
  const bodyBottom = 716;
  const bodyHeight = bodyBottom - bodyTop;

  const startPage = () => {
    current = [
      { text: "DR. FREDERIK", x: 42, y: 48, size: 10, bold: true, color: palette.purple },
      { text: `Gerado em ${date}`, x: 445, y: 48, size: 8, color: palette.muted },
      { text: "RELATÓRIO DE OBSERVAÇÕES", x: 42, y: 100, size: 13, bold: true, color: palette.purple },
      { text: "Conteúdo organizado por produto; cada observação permanece íntegra em uma página.", x: 42, y: 120, size: 8, color: palette.muted },
    ];
    reportPages.push(current);
    currentY = bodyTop;
  };
  startPage();

  medications.forEach((medication, index) => {
    let block: DocumentLine[] = [];
    let fontSize = 9.2;
    while (fontSize >= 7 && block.length === 0) {
      const candidate = buildMedicationBlock(medication, index, fontSize, context);
      const height = candidate.reduce((max, line) => Math.max(max, line.y - 148 + (line.kind === "rule" ? 10 : fontSize + 3)), 0);
      if (height <= bodyHeight) block = candidate;
      else fontSize -= 0.5;
    }
    if (!block.length) throw new Error(`A observação de “${medication.name}” é longa demais para caber em uma página sem corte. Revise a formatação antes de exportar.`);
    const blockHeight = Math.max(...block.map((line) => line.y - 148 + (line.kind === "rule" ? 10 : fontSize + 3)));
    if (currentY + blockHeight > bodyBottom && current.length > 4) startPage();
    const offset = currentY - bodyTop;
    block.forEach((line) => current.push({ ...line, y: line.y + offset }));
    firstProductPages.push(reportPages.length - 1);
    currentY += blockHeight;
  });

  const tocGroups: Array<Array<ReturnType<typeof wrapEntry>>> = [];
  let tocGroup: Array<ReturnType<typeof wrapEntry>> = [];
  let tocY = 178;
  medications.forEach((medication, index) => {
    const entry = wrapEntry(medication.name, firstProductPages[index], context);
    if (tocGroup.length && tocY + entry.height > 718) {
      tocGroups.push(tocGroup);
      tocGroup = [];
      tocY = 178;
    }
    tocGroup.push(entry);
    tocY += entry.height;
  });
  if (tocGroup.length || tocGroups.length === 0) tocGroups.push(tocGroup);

  const tocPages: DocumentPage[] = tocGroups.map((entries) => {
    const page: DocumentPage = [
      { text: "DR. FREDERIK", x: 42, y: 48, size: 10, bold: true, color: palette.purple },
      { text: `Gerado em ${date}`, x: 445, y: 48, size: 8, color: palette.muted },
      { text: "SUMÁRIO", x: 42, y: 112, size: 18, bold: true, color: palette.purple },
    ];
    let y = 175;
    entries.forEach((entry) => {
      entry.lines.forEach((line, index) => page.push({ text: line, x: 54, y: y + index * 12, size: 9.5, color: palette.purple }));
      const globalPage = 1 + tocGroups.length + entry.page + 1;
      page.push({ text: String(globalPage), x: 520, y, size: 10, bold: true, color: palette.purple });
      y += entry.height;
      if (y < 716) page.push({ text: "", x: 54, y: y - 4, size: 1, color: palette.rule, kind: "rule", width: 487 });
    });
    return page;
  });

  const referenceLines: DocumentLine[] = [];
  medications.forEach((medication) => {
    const references = parseObservation(medication.notes ?? "").references;
    if (!references.length) return;
    referenceLines.push({ text: medication.name, x: 50, y: 0, size: 10, bold: true, color: palette.purple });
    for (const reference of references) referenceLines.push({ text: reference, x: 62, y: 0, size: 9, color: palette.body });
  });
  if (!referenceLines.length) referenceLines.push({ text: "Nenhuma fonte técnica foi registrada nas observações dos medicamentos.", x: 50, y: 0, size: 10, color: palette.muted });

  const referencePages: DocumentPage[] = [];
  let referencePage: DocumentPage = [];
  let referenceY = 172;
  const startReferencePage = () => {
    referencePage = [
      { text: "DR. FREDERIK", x: 42, y: 48, size: 10, bold: true, color: palette.purple },
      { text: `Gerado em ${date}`, x: 445, y: 48, size: 8, color: palette.muted },
      { text: "REFERÊNCIAS TÉCNICAS", x: 42, y: 112, size: 16, bold: true, color: palette.purple },
    ];
    referencePages.push(referencePage);
    referenceY = 172;
  };
  startReferencePage();
  referenceLines.forEach((line) => {
    const wrapped = wrapText(line.text, line.size, Boolean(line.bold), line.bold ? 490 : 475, context);
    const height = wrapped.length * 13 + (line.bold ? 7 : 3);
    if (referenceY + height > 716) startReferencePage();
    wrapped.forEach((text) => {
      referencePage.push({ ...line, text, x: line.x, y: referenceY });
      referenceY += 13;
    });
    referenceY += line.bold ? 7 : 3;
  });

  const purple = palette.purple;
  const cover: DocumentPage = [
    { text: "DR. FREDERIK", x: 220, y: 255, size: 19, bold: true, color: purple },
    { text: "", x: 72, y: 310, size: 1, color: palette.rule, kind: "rule", width: 451 },
    { text: "RELATÓRIO DE OBSERVAÇÕES", x: 145, y: 375, size: 23, bold: true, color: purple },
    { text: "Observações de Medicamentos", x: 195, y: 414, size: 14, color: palette.muted },
    { text: date, x: 275, y: 472, size: 10, color: palette.muted },
  ];
  const allPages = [...[cover], ...tocPages, ...reportPages, ...referencePages];
  allPages.forEach((page, index) => {
    page.push({ text: "RELATÓRIO DE OBSERVAÇÕES", x: 42, y: 750, size: 8, color: palette.muted });
    page.push({ text: date, x: 272, y: 750, size: 8, color: palette.muted });
    page.push({ text: `Página ${index + 1} de ${allPages.length}`, x: 472, y: 750, size: 8, color: palette.muted });
  });
  return allPages;
}

export function registeredTechnicalReferences(medications: MedicationRecord[]) {
  return medications.reduce((total, medication) => total + parseObservation(medication.notes ?? "").references.length, 0);
}

export const medicationObservationSections = observationSections;
