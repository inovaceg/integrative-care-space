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
    <line x1="234" y1="160" x2="234" y2="757" stroke="#d5ad4d" strokeWidth="1.2" />
    <path d="M23 154H204Q213 154 213 163V172Q213 181 204 181H23Z" fill="#102e54" />
    <text x="118" y="172" fontFamily="Georgia, 'Times New Roman', serif" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">Áreas de Atuação</text>
    <g fontFamily="Georgia, 'Times New Roman', serif" fontSize="8.2" fontWeight="700" fill="#102e54">
      <text x="45" y="205">Biomédico esteta</text>
      <text x="45" y="231">Ortomolecular e</text><text x="45" y="242">regenerativa</text>
      <text x="45" y="268">Farmacologia clínica e</text><text x="45" y="279">prescrição farmacêutica</text>
      <text x="45" y="305">Saúde mental</text>
      <text x="45" y="331">Depressão e ansiedade</text>
      <text x="45" y="357">Dependência química</text>
      <text x="45" y="383">Terapia familiar e de casal</text>
      <text x="45" y="409">Sexologia</text>
      <text x="45" y="435">Neuropsicologia clínica</text>
      <text x="45" y="446">e reabilitação</text><text x="45" y="457">neuropsicológica</text>
      <text x="45" y="483">TOD, TDAH e TEA</text>
    </g>
    <text x="297.5" y="595" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="235" fill="#e7eef5">Ψ</text>
    {page.filter(line => line.y < 720).map((line, index) => line.kind === "rule" ? <line key={index} x1={line.x} y1={line.y} x2={line.x + (line.width ?? 0)} y2={line.y} stroke={line.color ?? "#cbd5dc"} strokeWidth="0.7" /> : <text key={index} x={line.x} y={line.y} fontFamily="Arial, Helvetica, sans-serif" fontSize={line.size} fontWeight={line.bold ? 700 : 400} fill={line.color ?? "#172d45"} textDecoration={line.text === "RECEITUÁRIO" ? "underline" : undefined} xmlSpace="preserve">{line.text}</text>)}
    <line x1="48" y1="720" x2="547" y2="720" stroke="#d5ad4d" strokeWidth="0.8" />
    <text x="80" y="750" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" fontWeight="700" fill="#102e54">(32) 9 9193-1779</text>
    <line x1="220" y1="737" x2="220" y2="755" stroke="#777" strokeWidth="0.7" />
    <text x="244" y="750" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" fontWeight="700" fill="#102e54">Juiz de Fora – MG</text>
    <line x1="365" y1="737" x2="365" y2="755" stroke="#777" strokeWidth="0.7" />
    <text x="388" y="750" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" fontWeight="700" fill="#102e54">drfredmartins.com.br</text>
    <path d="M0 802C121 788 185 816 281 810C395 804 476 773 595 794V842H0Z" fill="#102e54" />
    <path d="M0 802C121 788 185 816 281 810C395 804 476 773 595 794V804C476 783 395 814 281 820C185 826 121 798 0 812Z" fill="#d5ad4d" />
  </svg>;
}
