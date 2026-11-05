import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { ClinicalProtocol } from "./protocols";

const navy = "#102e4e";
const gold = "#c19a51";

function pdfDefinition(protocols: ClinicalProtocol[]) {
  const content: any[] = [
    { text: "PROTOCOLOS CLÍNICOS", style: "title", margin: [0, 0, 0, 4] },
    { text: "Dr. Frederick Martins Parreira", style: "subtitle", margin: [0, 0, 0, 18] },
  ];

  protocols.forEach((protocol, index) => {
    const rows: any[] = [[
      { text: protocol.number, style: "number", fillColor: navy, border: [false, false, false, true], borderColor: [navy, navy, navy, gold] },
      { text: [protocol.category && { text: `${protocol.category.toUpperCase()}\n`, style: "category" }, { text: protocol.title, style: "protocolTitle" }].filter(Boolean), fillColor: navy, border: [false, false, false, true], borderColor: [navy, navy, navy, gold] },
    ]];
    protocol.fields.forEach(field => rows.push([
      { text: field.label.toUpperCase(), style: "fieldLabel", fillColor: "#f3f6f9", border: [false, false, false, true], borderColor: ["#f3f6f9", "#f3f6f9", "#f3f6f9", "#d9e1e9"] },
      { text: field.value, style: "fieldValue", border: [false, false, false, true], borderColor: ["#ffffff", "#ffffff", "#ffffff", "#d9e1e9"] },
    ]));
    content.push({ table: { widths: [58, "*"], body: rows }, layout: { paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 7, paddingBottom: () => 7 }, margin: [0, 0, 0, index === protocols.length - 1 ? 0 : 18], dontBreakRows: true });
  });
  return {
    pageSize: "A4",
    pageMargins: [42, 48, 42, 44],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#334155" },
    styles: {
      title: { fontSize: 18, bold: true, color: navy },
      subtitle: { fontSize: 9, color: "#64748b" },
      number: { fontSize: 18, bold: true, color: gold, alignment: "center", verticalAlignment: "middle" },
      category: { fontSize: 8, bold: true, color: gold, characterSpacing: 1 },
      protocolTitle: { fontSize: 13, bold: true, color: "#ffffff" },
      fieldLabel: { fontSize: 8, bold: true, color: navy },
      fieldValue: { fontSize: 10, lineHeight: 1.25 },
    },
    footer: (page: number, pages: number) => ({ text: `${page} / ${pages}`, alignment: "right", margin: [0, 0, 42, 0], fontSize: 8, color: "#64748b" }),
    content,
  };
}

export function downloadProtocolsPdf(protocols: ClinicalProtocol[]) {
  (pdfMake as any).vfs = pdfFonts;
  pdfMake.createPdf(pdfDefinition(protocols)).download("protocolos-clinicos.pdf");
}

export function printProtocols(protocols: ClinicalProtocol[]) {
  (pdfMake as any).vfs = pdfFonts;
  pdfMake.createPdf(pdfDefinition(protocols)).print();
}
