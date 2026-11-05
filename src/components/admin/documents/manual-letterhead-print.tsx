import { createPortal } from "react-dom";
import { ManualLetterheadArt } from "./manual-letterhead-art";
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
    <ManualLetterheadArt page={page} className="block h-auto w-full" />
  </div>, document.body);
}
