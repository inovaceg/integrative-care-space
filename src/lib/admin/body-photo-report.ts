import { supabase } from "@/integrations/supabase/client";
import { listPhotos, type BodyEvaluation, type PhotoView, type ProgressPhoto } from "./body-progress";
import { displayDate, professionalName } from "./documents";

const PAGE_WIDTH = 2480;
const PAGE_HEIGHT = 3508;
export const photoReportViewLabels: Record<PhotoView, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Posterior",
};
export type PhotoReportPage = { view: PhotoView; dataUrl: string };

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar uma fotografia. Tente novamente."));
    image.src = url;
  });
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let line = "";
  for (const character of text.replace(/\s+/g, " ").trim()) {
    if (context.measureText(line + character).width > maxWidth && line) {
      lines.push(line.trim());
      line = "";
    }
    line += character;
  }
  if (line) lines.push(line.trim());
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[maxLines - 1] ?? "";
    while (context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    visible[maxLines - 1] = `${last}…`;
  }
  visible.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
}

async function drawPhoto(
  context: CanvasRenderingContext2D,
  photo: ProgressPhoto | undefined,
  x: number,
  label: string,
  signal: AbortSignal,
) {
  const width = 1030;
  const height = 1520;
  const top = 510;
  const center = x + width / 2;
  context.fillStyle = "#21655f";
  context.font = "bold 42px Arial";
  context.fillText(label, center, 465);
  context.fillStyle = "#f8fafc";
  context.fillRect(x, top, width, height);
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2;
  context.strokeRect(x, top, width, height);
  context.fillStyle = "#475569";
  if (!photo) {
    context.font = "36px Arial";
    context.fillText("Sem foto registrada", center, top + height / 2);
    return;
  }

  signal.throwIfAborted();
  const downloaded = await supabase.storage.from("body-progress-photos").download(photo.storage_path);
  signal.throwIfAborted();
  if (downloaded.error || !downloaded.data) {
    throw new Error("Não foi possível obter todas as fotografias. Verifique sua conexão e permissão de acesso.");
  }
  const url = URL.createObjectURL(downloaded.data);
  try {
    const image = await loadImage(url);
    signal.throwIfAborted();
    const scale = Math.min((width - 30) / image.naturalWidth, (height - 30) / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    context.drawImage(image, x + (width - imageWidth) / 2, top + (height - imageHeight) / 2, imageWidth, imageHeight);
  } finally {
    URL.revokeObjectURL(url);
  }

  context.fillStyle = "#172033";
  context.font = "bold 36px Arial";
  context.fillText(`Data: ${displayDate(photo.record_date)}`, center, 2095);
  if (photo.caption) {
    context.fillStyle = "#475569";
    context.font = "32px Arial";
    drawWrappedText(context, photo.caption, center, 2160, width - 30, 44, 5);
  }
}

export async function bodyPhotoReportPages(
  professionalId: string,
  patientId: string,
  evaluation: BodyEvaluation,
  patientName: string,
  signal: AbortSignal,
): Promise<PhotoReportPage[]> {
  if (evaluation.patient_id !== patientId || evaluation.profissional_id !== professionalId || !patientName.trim()) {
    throw new Error("Selecione uma avaliação e um paciente válidos para gerar o relatório.");
  }
  signal.throwIfAborted();
  const result = await listPhotos(professionalId, patientId, evaluation.id);
  signal.throwIfAborted();
  if (result.error) throw new Error("Não foi possível consultar as fotografias desta avaliação.");
  const records = (result.data ?? []) as ProgressPhoto[];
  const prefix = `${professionalId}/${patientId}/${evaluation.id}/`;
  for (const photo of records) {
    if (photo.profissional_id !== professionalId || photo.patient_id !== patientId || photo.evaluation_id !== evaluation.id || !photo.storage_path.startsWith(prefix)) {
      throw new Error("Registro fotográfico não autorizado para esta avaliação.");
    }
  }

  const pages: PhotoReportPage[] = [];
  for (const view of ["front", "side", "back"] as const) {
    const before = records.find((photo) => photo.view === view && photo.stage === "before");
    const after = records.find((photo) => photo.view === view && photo.stage === "after");
    if (!before && !after) continue;
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Este navegador não conseguiu preparar o relatório.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
      context.textAlign = "center";
      context.fillStyle = "#123c3d";
      context.font = "bold 64px Arial";
      context.fillText("RELATÓRIO FOTOGRÁFICO DE EVOLUÇÃO", PAGE_WIDTH / 2, 155);
      context.font = "36px Arial";
      context.fillText(`Avaliação: ${displayDate(evaluation.evaluation_date)} · ${photoReportViewLabels[view]}`, PAGE_WIDTH / 2, 220);
      context.font = "bold 44px Arial";
      drawWrappedText(context, `Paciente: ${patientName}`, PAGE_WIDTH / 2, 295, 2140, 52, 3);

      await drawPhoto(context, before, 160, "ANTES", signal);
      await drawPhoto(context, after, 1290, "DEPOIS", signal);
      signal.throwIfAborted();

      context.strokeStyle = "#cce7df";
      context.beginPath();
      context.moveTo(240, 2835);
      context.lineTo(2240, 2835);
      context.stroke();
      context.fillStyle = "#123c3d";
      context.font = "bold 44px Arial";
      context.fillText(professionalName, PAGE_WIDTH / 2, 2920);
      context.fillStyle = "#475569";
      context.font = "32px Arial";
      context.fillText("Dr. em Psicanálise • Psicólogo Clínico • Biomédico Esteta e Integrativo", PAGE_WIDTH / 2, 2990);
      context.fillStyle = "#21655f";
      context.font = "bold 36px Arial";
      context.fillText("CRP 04/86194 • CRBM 30421", PAGE_WIDTH / 2, 3055);
      context.fillStyle = "#475569";
      context.font = "34px Arial";
      context.fillText("Telefone: (32) 9 9193-1779 | drfredmartins.com.br", PAGE_WIDTH / 2, 3170);
      context.fillText("Juiz de Fora – MG", PAGE_WIDTH / 2, 3235);
      context.font = "28px Arial";
      context.fillStyle = "#64748b";
      context.fillText("Documento clínico privado", PAGE_WIDTH / 2, 3390);

      // Raster A4 at 300 dpi; original photographs in Storage are never modified.
      pages.push({ view, dataUrl: canvas.toDataURL("image/jpeg", 0.98) });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  return pages;
}

export function photoReportPdf(pages: PhotoReportPage[]) {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [0];
  let length = 0;
  function append(value: string | Uint8Array) {
    const data = typeof value === "string" ? encoder.encode(value) : value;
    const start = length;
    parts.push(new Uint8Array(data).buffer);
    length += data.byteLength;
    return start;
  }
  append("%PDF-1.4\n");
  const pageIds: number[] = [];
  pages.forEach((page, index) => {
    const raw = atob(page.dataUrl.slice(page.dataUrl.indexOf(",") + 1));
    const jpeg = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) jpeg[i] = raw.charCodeAt(i);
    const imageId = 3 + index * 3;
    const contentId = imageId + 1;
    const pageId = imageId + 2;
    offsets[imageId] = append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    append(jpeg);
    append("\nendstream\nendobj\n");
    const content = "q\n595.28 0 0 841.89 0 0 cm\n/PhotoPage Do\nQ";
    offsets[contentId] = append(`${contentId} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
    offsets[pageId] = append(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PhotoPage ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
    pageIds.push(pageId);
  });
  offsets[1] = append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  offsets[2] = append(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);
  const xref = length;
  const objectCount = 3 + pages.length * 3;
  append(`xref\n0 ${objectCount}\n0000000000 65535 f \n`);
  for (let id = 1; id < objectCount; id++) {
    append(`${String(offsets[id]!).padStart(10, "0")} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}

export function reportFilename(name: string, evaluationDate: string) {
  const patient = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `relatorio-fotografico-${patient}-${evaluationDate}`;
}
