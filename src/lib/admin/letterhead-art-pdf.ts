import { documentBrandPdf, documentBrandWatermarkPdf } from "@/lib/admin/document-brand";

export const letterheadArtPdf = `q
0.063 0.180 0.329 rg
0 842 m 595 842 l 595 739 l
498 725 410 750 304 744 c
195 738 91 716 0 731 c
h f
0.835 0.678 0.302 RG
2 w
0 737 m 91 722 195 744 304 750 c
410 756 498 731 595 745 c
S
0.835 0.678 0.302 RG
0.8 w
52 705 m 543 705 l S
222 670 m 260 670 l S
335 670 m 373 670 l S
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
