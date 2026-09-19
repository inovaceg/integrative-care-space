import { createPortal } from 'react-dom';
import type { DocumentPage } from '@/lib/admin/document-layout';
import { documentBrand } from '@/lib/admin/document-brand';

export function A4Page({ lines, index, showBrand = false }: { lines: DocumentPage; index: number; showBrand?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img" aria-label={`Documento A4, página ${index + 1}`} className="block h-auto w-full bg-white">
      <rect width="595" height="842" fill="white" />
      {showBrand && (
        <g transform={documentBrand.transform} aria-label="Logomarca Ψ">
          <path d={documentBrand.backgroundPath} fill={documentBrand.color} />
          <path d={documentBrand.symbolPath} fill="none" stroke="white" strokeWidth={documentBrand.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {lines.map((line, i) => <text key={i} x={line.x} y={line.y} fontFamily="Arial, Helvetica, sans-serif" fontSize={line.size} fontWeight={line.bold ? 700 : 400} fill={line.color ?? '#17232d'} xmlSpace="preserve">{line.text}</text>)}
    </svg>
  );
}
export function DocumentPreview({ pages, showBrand = false }: { pages: DocumentPage[]; showBrand?: boolean }) {
  return <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-100 p-3 sm:p-5"><div className="flex items-center justify-between text-xs text-slate-500"><span>Pré-visualização A4</span><span>{pages.length} página(s)</span></div>{pages.map((lines, i) => <div key={i} className="mx-auto max-w-[794px] overflow-hidden border border-slate-200 bg-white shadow-sm"><A4Page lines={lines} index={i} showBrand={showBrand} /></div>)}<p className="text-xs leading-5 text-slate-500">Revise todos os dados antes da emissão. A assinatura deve ser realizada pelo profissional responsável.</p></div>;
}
export function PrintDocument({ pages, showBrand = false }: { pages: DocumentPage[]; showBrand?: boolean }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<div id="professional-document-print"><style>{`
    #professional-document-print { display: none; }
    @media print {
      @page { size: A4; margin: 0; }
      body:has(#professional-document-print) { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; height: auto !important; }
      body:has(#professional-document-print) > *:not(#professional-document-print) { display: none !important; }
      #professional-document-print { display: block !important; }
      #professional-document-print .document-print-page { width: 210mm; height: 297mm; break-after: page; break-inside: avoid; margin: 0; }
      #professional-document-print .document-print-page:last-child { break-after: auto; }
      #professional-document-print svg { display: block; width: 210mm; height: 297mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `}</style>{pages.map((lines, i) => <div className="document-print-page" key={i}><A4Page lines={lines} index={i} showBrand={showBrand} /></div>)}</div>, document.body);
}
