import { documentBrand } from "@/lib/admin/document-brand";
import type { DocumentPage } from "@/lib/admin/document-layout";

export function ManualLetterheadArt({ page, className }: { page: DocumentPage; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img" aria-label="Papel timbrado A4 do Dr. Frederick" className={className}>
    <rect width="595" height="842" fill="#fff" />
    <path d="M0 0H595V103C498 117 410 92 304 98C195 104 91 126 0 111Z" fill="#102e54" />
    <path d="M0 105C103 120 197 98 304 93C410 87 498 112 595 97V106C498 121 410 96 304 102C195 108 91 130 0 115Z" fill="#d5ad4d" />
    <g transform={documentBrand.transform} aria-label="Logomarca original">
      <path d={documentBrand.backgroundPath} fill={documentBrand.color} />
      <path d={documentBrand.symbolPath} fill="none" stroke="white" strokeWidth={documentBrand.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <line x1="52" y1="137" x2="543" y2="137" stroke="#d5ad4d" strokeWidth="1" />
    <line x1="222" y1="172" x2="260" y2="172" stroke="#d5ad4d" strokeWidth="1.5" />
    <line x1="335" y1="172" x2="373" y2="172" stroke="#d5ad4d" strokeWidth="1.5" />
    <text x="297.5" y="595" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="235" fill="#e7eef5">Ψ</text>
    {page.map((line, index) => line.kind === "rule" ? <line key={index} x1={line.x} y1={line.y} x2={line.x + (line.width ?? 0)} y2={line.y} stroke={line.color ?? "#cbd5dc"} strokeWidth="0.7" /> : <text key={index} x={line.x} y={line.y} fontFamily="Arial, Helvetica, sans-serif" fontSize={line.size} fontWeight={line.bold ? 700 : 400} fill={line.color ?? "#172d45"} textDecoration={line.text === "RECEITUÁRIO" ? "underline" : undefined} xmlSpace="preserve">{line.text}</text>)}
    <path d="M0 802C121 788 185 816 281 810C395 804 476 773 595 794V842H0Z" fill="#102e54" />
    <path d="M0 802C121 788 185 816 281 810C395 804 476 773 595 794V804C476 783 395 814 281 820C185 826 121 798 0 812Z" fill="#d5ad4d" />
  </svg>;
}
