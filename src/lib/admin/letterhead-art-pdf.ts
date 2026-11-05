import { documentBrandPdf, documentBrandWatermarkPdf } from "@/lib/admin/document-brand";

export const letterheadArtPdf = `q
0.063 0.180 0.329 rg
0 842 m 595 842 l 595 772 l
510 748 424 799 324 795 c
210 790 118 740 0 766 c
h f
0.835 0.678 0.302 RG
2 w
0 773 m 118 765 210 799 324 803 c
424 807 510 757 595 782 c
S
0.835 0.678 0.302 RG
0.8 w
52 724 m 543 724 l S
222 690 m 260 690 l S
335 690 m 373 690 l S
0.063 0.180 0.329 rg
0 40 m
121 54 185 26 281 32 c
395 38 476 69 595 48 c
595 0 l 0 0 l h f
0.835 0.678 0.302 RG
2 w
0 40 m
121 54 185 26 281 32 c
395 38 476 69 595 48 c
S
Q
${documentBrandWatermarkPdf}
${documentBrandPdf}`;
