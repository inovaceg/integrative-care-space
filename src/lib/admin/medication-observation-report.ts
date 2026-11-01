import type { MedicationRecord } from "@/lib/admin/types";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

type ReviewFlag = { label: string; tone: "amber" | "rose" | "slate" };
type ObservationSection = "PARA QUE SERVE?" | "PRINCIPAIS APLICAÇÕES" | "MECANISMO DE AÇÃO" | "CUIDADOS E CONTRAINDICAÇÕES";

const sections: ObservationSection[] = [
  "PARA QUE SERVE?",
  "PRINCIPAIS APLICAÇÕES",
  "MECANISMO DE AÇÃO",
  "CUIDADOS E CONTRAINDICAÇÕES",
];
const colors = { purple: "#39245d", teal: "#26796e", body: "#302a38", muted: "#746c7e", line: "#e7e2ed", amber: "#9a5b00", rose: "#a43650", slate: "#586273" };
const logo = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#26796e"/><g fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 14v37M25 51h14M27 14h10M14 18h8v11c0 10 6 14 14 14s14-4 14-14V18h-8"/></g></svg>';

function normalizeHeading(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function parseObservation(notes: string) {
  const result: Record<ObservationSection | "CONTEÚDO COMPLEMENTAR", string[]> = {
    "PARA QUE SERVE?": [],
    "PRINCIPAIS APLICAÇÕES": [],
    "MECANISMO DE AÇÃO": [],
    "CUIDADOS E CONTRAINDICAÇÕES": [],
    "CONTEÚDO COMPLEMENTAR": [],
  };
  const references: string[] = [];
  let active: ObservationSection | "CONTEÚDO COMPLEMENTAR" | "REFERÊNCIAS TÉCNICAS" = "CONTEÚDO COMPLEMENTAR";

  for (const line of notes.split(/\r\n|\n|\r/)) {
    const heading = normalizeHeading(line);
    const match = sections.find((section) => normalizeHeading(section) === heading);
    if (match) {
      active = match;
      continue;
    }
    if (heading.startsWith("STATUS INTERNO:")) continue;
    if (heading === "REFERENCIAS TECNICAS") {
      active = "REFERÊNCIAS TÉCNICAS";
      continue;
    }
    if (!line.trim()) continue;
    if (active === "REFERÊNCIAS TÉCNICAS") references.push(line.trim());
    else result[active].push(line.trim());
  }
  return { sections: result, references };
}

export function medicationReviewFlags(medication: MedicationRecord): ReviewFlag[] {
  const name = normalizeHeading(medication.name);
  const flags: ReviewFlag[] = [];
  const compositionConfirmed = /^STATUS INTERNO:\s*COMPOSIÇÃO CONFIRMADA\s*$/im.test(medication.notes ?? "");
  if (!compositionConfirmed) flags.push({ label: "Composição pendente", tone: "amber" });
  if (/\b(MASTEROM|TIZERC|DURA|ENATHATE)\b/.test(name)) flags.push({ label: "Nome comercial a confirmar", tone: "rose" });
  if (/\bMAGANES\b|\bMANGANES\s*20\s*MG\b/.test(name)) flags.push({ label: "Possível duplicidade", tone: "rose" });
  if (!parseObservation(medication.notes ?? "").references.length) flags.push({ label: "Informação técnica pendente", tone: "slate" });
  return flags;
}

function flagColor(tone: ReviewFlag["tone"]) {
  return tone === "amber" ? colors.amber : tone === "rose" ? colors.rose : colors.slate;
}

function observationContent(medication: MedicationRecord, index: number) {
  const parsed = parseObservation(medication.notes ?? "");
  const id = `medication-${index + 1}`;
  const blocks: any[] = [
    { text: `${String(index + 1).padStart(2, "0")}  ${medication.name}`, id, tocItem: true, style: "productTitle", margin: [0, 0, 0, 2] },
  ];
  const flags = medicationReviewFlags(medication);
  if (flags.length) blocks.push({ text: flags.map((flag) => ({ text: `${flag.label}   `, color: flagColor(flag.tone), bold: true })).flat(), fontSize: 7.5, margin: [5, 0, 0, 2] });

  sections.forEach((heading) => {
    const paragraphs = parsed.sections[heading];
    blocks.push({ text: heading, style: heading === "CUIDADOS E CONTRAINDICAÇÕES" ? "careHeading" : "sectionHeading", margin: [5, 2, 0, 0] });
    blocks.push({ text: paragraphs.length ? paragraphs.join("\n\n") : "Não informado na observação cadastrada.", style: "bodyText", margin: [11, 0, 0, 0] });
  });

  const complementary = parsed.sections["CONTEÚDO COMPLEMENTAR"];
  if (complementary.length) blocks.push({ text: [{ text: "INFORMAÇÕES COMPLEMENTARES\n", bold: true, color: colors.teal }, complementary.join("\n\n")], style: "bodyText", margin: [5, 3, 0, 0] });
  return { id, name: medication.name, blocks, references: parsed.references };
}

export async function downloadMedicationObservationReport(medications: MedicationRecord[], filename: string) {
  (pdfMake as any).vfs = pdfFonts;
  const products = medications.map(observationContent);
  const splitAt = Math.ceil(products.length / 2);
  const tocColumn = (entries: typeof products) => entries.map((entry) => ({
    columns: [
      { text: entry.name, linkToDestination: entry.id, width: "*", fontSize: 8.5, color: colors.purple },
      { text: "0", pageReference: entry.id, width: 25, alignment: "right", fontSize: 8.5, color: colors.muted },
    ],
    margin: [0, 0, 0, 7],
  }));
  const date = new Date().toLocaleDateString("pt-BR");
  const contents: any[] = [
    { svg: logo, width: 54, height: 54, alignment: "center", margin: [0, 95, 0, 20] },
    { text: "DR. FREDERIK", style: "coverBrand", alignment: "center" },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 1, lineColor: colors.teal }], alignment: "center", margin: [0, 22, 0, 22] },
    { text: "RELATÓRIO DE\nOBSERVAÇÕES", style: "coverTitle", alignment: "center" },
    { text: "Observações de Medicamentos", style: "coverSubtitle", alignment: "center", margin: [0, 12, 0, 0] },
    { text: `Gerado em ${date}`, style: "coverDate", alignment: "center", margin: [0, 32, 0, 0], pageBreak: "after" },
    { text: "SUMÁRIO", style: "contentsTitle", margin: [0, 0, 0, 16] },
    { columns: [{ stack: tocColumn(products.slice(0, splitAt)), width: "*" }, { stack: tocColumn(products.slice(splitAt)), width: "*" }], columnGap: 28, margin: [0, 0, 0, 12] },
  ];
  if (products.length) contents[contents.length - 1].pageBreak = "after";

  products.forEach((product, index) => {
    contents.push({ stack: product.blocks, unbreakable: true, margin: [0, 0, 0, 6] });
    if (index < products.length - 1) contents.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 519, y2: 0, lineWidth: 0.5, lineColor: colors.line }], margin: [0, 0, 0, 4] });
  });

  const references = products.flatMap((product) => product.references.map((reference) => ({ name: product.name, reference })));
  contents.push({ text: "REFERÊNCIAS TÉCNICAS", style: "contentsTitle", pageBreak: "before", margin: [0, 0, 0, 14] });
  if (references.length) {
    references.forEach(({ name, reference }) => contents.push({ stack: [{ text: name, bold: true, color: colors.purple, fontSize: 9 }, { text: reference, fontSize: 8.5, color: colors.body }], margin: [0, 0, 0, 9], unbreakable: true }));
  } else {
    contents.push({ text: "Nenhuma referência técnica foi registrada nas observações dos medicamentos.", fontSize: 9, color: colors.muted });
  }

  const definition = {
    pageSize: "A4",
    pageMargins: [38, 62, 38, 40],
    defaultStyle: { font: "Roboto", fontSize: 9, color: colors.body, lineHeight: 1.2 },
    styles: {
      coverBrand: { fontSize: 11, bold: true, color: colors.teal, characterSpacing: 1.2 },
      coverTitle: { fontSize: 24, bold: true, color: colors.purple, lineHeight: 1.18 },
      coverSubtitle: { fontSize: 13, color: colors.muted },
      coverDate: { fontSize: 9, color: colors.muted },
      contentsTitle: { fontSize: 16, bold: true, color: colors.purple },
      productTitle: { fontSize: 12, bold: true, color: colors.purple },
      sectionHeading: { fontSize: 8, bold: true, color: colors.teal, characterSpacing: 0.35 },
      careHeading: { fontSize: 8, bold: true, color: "#76503d", characterSpacing: 0.35 },
      bodyText: { fontSize: 8.7, color: colors.body, lineHeight: 1.17 },
    },
    header: (page: number) => page === 1 ? null : ({
      margin: [38, 15, 38, 0],
      columns: [
        { svg: logo, width: 22, height: 22, margin: [0, 0, 8, 0] },
        { text: "DR. FREDERIK  ·  RELATÓRIO DE OBSERVAÇÕES", fontSize: 8, bold: true, color: colors.purple, margin: [0, 6, 0, 0] },
        { text: date, alignment: "right", fontSize: 8, color: colors.muted, margin: [0, 6, 0, 0] },
      ],
    }),
    footer: (page: number, pageCount: number) => ({
      margin: [38, 0, 38, 14],
      columns: [
        { text: "RELATÓRIO DE OBSERVAÇÕES", fontSize: 7.5, color: colors.muted },
        { text: date, alignment: "center", fontSize: 7.5, color: colors.muted },
        { text: `Página ${page} de ${pageCount}`, alignment: "right", fontSize: 7.5, color: colors.muted },
      ],
    }),
    content: contents,
  };
  pdfMake.createPdf(definition as any).download(filename);
}

export function registeredTechnicalReferences(medications: MedicationRecord[]) {
  return medications.reduce((count, medication) => count + parseObservation(medication.notes ?? "").references.length, 0);
}

export const medicationObservationSections = sections;
