import * as mammoth from "mammoth";

export type ProtocolField = { label: string; value: string };
export type ClinicalProtocol = {
  number: string;
  category: string;
  title: string;
  fields: ProtocolField[];
};
export type ProtocolLibrary = { source: string; protocols: ClinicalProtocol[] };
export const protocolStorageKey = "admin:protocol-library:cards-v2";

function paragraphs(element: Element): string[] {
  const blocks = Array.from(element.querySelectorAll("p"));
  return (blocks.length ? blocks.map(block => block.textContent ?? "") : [element.textContent ?? ""])
    .flatMap(text => text.split("\n"))
    .map(text => text.replace(/\u00a0/g, " ").trim()).filter(Boolean);
}

export function parseProtocolHtml(html: string): ClinicalProtocol[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("br").forEach(lineBreak => lineBreak.replaceWith("\n"));
  const protocols: ClinicalProtocol[] = [];
  let current: ClinicalProtocol | null = null;

  // Word stores the numbered banner and the clinical fields in table rows.
  // Work with text nodes only; imported HTML is never inserted in the page.
  for (const row of Array.from(document.querySelectorAll("tr"))) {
    const cells = Array.from(row.children).filter(cell => /^(TD|TH)$/.test(cell.tagName));
    if (!cells.length) continue;
    const first = paragraphs(cells[0]).join(" ");
    const number = first.match(/^(?:protocolo\s*)?(\d{1,4})[.\-:)]?$/i);
    if (number && cells.length > 1) {
      const heading = cells.slice(1).flatMap(paragraphs);
      if (!heading.length) continue;
      current = {
        number: number[1].padStart(3, "0"),
        category: heading.length > 1 ? heading.slice(0, -1).join(" ") : "",
        title: heading[heading.length - 1],
        fields: [],
      };
      protocols.push(current);
      continue;
    }
    if (!current) continue;
    if (cells.length > 1) {
      current.fields.push({ label: first, value: cells.slice(1).flatMap(paragraphs).join("\n") });
    } else {
      const value = paragraphs(cells[0]).join("\n");
      if (value) current.fields.push({ label: "Informações adicionais", value });
    }
  }

  const complete = protocols.filter(protocol => protocol.fields.some(field =>
    /^(formula|via|tecnica|contraindicacao)\b/.test(normalizeProtocolSearch(field.label)),
  ));
  if (complete.length) return complete;
  throw new Error("Não foram identificados protocolos nas tabelas deste Word. Use o documento com cabeçalhos numerados e linhas de fórmula, via, técnica e contraindicação, como no modelo enviado.");
}

export async function importProtocolWord(file: Blob, source: string): Promise<ProtocolLibrary> {
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return { source, protocols: parseProtocolHtml(result.value) };
}

export function normalizeProtocolSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}
