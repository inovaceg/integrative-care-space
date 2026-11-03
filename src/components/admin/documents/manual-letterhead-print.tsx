import { createPortal } from "react-dom";
import { documentBrand } from "@/lib/admin/document-brand";
import type { DocumentPage } from "@/lib/admin/document-layout";

export function ManualLetterheadPrint({ page }: { page: DocumentPage }) {
  if (typeof document === "undefined") return null;
  return createPortal(<div id="manual-letterhead-print">
    <style>{`
      #manual-letterhead-print { display: none; }
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body:has(#manual-letterhead-print) { margin: 0 !important; padding: 0 !important; background: white !important; }
        body:has(#manual-letterhead-print) > *:not(#manual-letterhead-print) { display: none !important; }
        #manual-letterhead-print { display: block !important; width: 210mm; height: 297mm; break-after: avoid; }
        #manual-letterhead-print svg { display: block; width: 210mm; height: 297mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `}</style>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img" aria-label="Papel timbrado A4 do Dr. Frederick">
      <rect width="595" height="842" fill="#fff" />
      <g transform={documentBrand.transform} aria-label="Logomarca original">
        <path d={documentBrand.backgroundPath} fill={documentBrand.color} />
        <path d={documentBrand.symbolPath} fill="none" stroke="white" strokeWidth={documentBrand.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {page.map((line, index) => line.kind === "rule" ? <line key={index} x1={line.x} y1={line.y} x2={line.x + (line.width ?? 0)} y2={line.y} stroke={line.color ?? "#cbd5dc"} strokeWidth="0.7" /> : <text key={index} x={line.x} y={line.y} fontFamily="Arial, Helvetica, sans-serif" fontSize={line.size} fontWeight={line.bold ? 700 : 400} fill={line.color ?? "#172d45"} xmlSpace="preserve">{line.text}</text>)}
    </svg>
  </div>, document.body);
}
