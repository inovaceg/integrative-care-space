import { useEffect, useRef, useState } from "react";
import { FileDown, Images, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  bodyPhotoReportPages,
  photoReportPdf,
  photoReportViewLabels,
  reportFilename,
  type PhotoReportPage,
} from "@/lib/admin/body-photo-report";
import type { BodyEvaluation } from "@/lib/admin/body-progress";

type Props = {
  professionalId: string;
  patientId: string;
  patientName: string;
  evaluation: BodyEvaluation;
};

export function BodyPhotoReport({ professionalId, patientId, patientName, evaluation }: Props) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<PhotoReportPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"print" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const downloads = useRef(new Set<string>());

  function releaseResources() {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    frame.current?.remove();
    frame.current = null;
    downloads.current.forEach((url) => URL.revokeObjectURL(url));
    downloads.current.clear();
  }

  useEffect(() => {
    setOpen(false);
    setPages([]);
    setError("");
    setAction(null);
    return releaseResources;
  }, [professionalId, patientId, evaluation.id, patientName]);

  async function load() {
    releaseResources();
    const current = generation.current;
    const request = new AbortController();
    controller.current = request;
    setPages([]);
    setLoading(true);
    setAction(null);
    setError("");
    try {
      const result = await bodyPhotoReportPages(professionalId, patientId, evaluation, patientName, request.signal);
      if (current === generation.current) setPages(result);
    } catch (failure) {
      if (current === generation.current && !request.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Não foi possível preparar o relatório.");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  function download() {
    if (!pages.length || action) return;
    setAction("pdf");
    setError("");
    try {
      const url = URL.createObjectURL(photoReportPdf(pages));
      downloads.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${reportFilename(patientName, evaluation.evaluation_date)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        downloads.current.delete(url);
      }, 1000);
    } catch {
      setError("Não foi possível gerar o PDF. Tente novamente ou utilize a opção Imprimir.");
    } finally {
      setAction(null);
    }
  }

  async function print() {
    if (!pages.length || action) return;
    setAction("print");
    setError("");
    const current = generation.current;
    const iframe = document.createElement("iframe");
    iframe.title = "Impressão do relatório fotográfico";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    frame.current?.remove();
    frame.current = iframe;
    document.body.appendChild(iframe);

    function cleanup() {
      iframe.remove();
      if (frame.current === iframe) frame.current = null;
      if (current === generation.current) setAction(null);
    }

    try {
      const printDocument = iframe.contentDocument;
      const printWindow = iframe.contentWindow;
      if (!printDocument || !printWindow) throw new Error("Não foi possível abrir a impressão.");
      printDocument.title = reportFilename(patientName, evaluation.evaluation_date);
      const style = printDocument.createElement("style");
      style.textContent = `
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; }
        .photo-page { display: block; width: 210mm; height: 297mm; object-fit: contain; break-inside: avoid; break-after: page; }
        .photo-page:last-child { break-after: auto; }
      `;
      printDocument.head.appendChild(style);
      const imageLoads = pages.map((page) => new Promise<void>((resolve, reject) => {
        const image = printDocument.createElement("img");
        image.className = "photo-page";
        image.alt = `Relatório fotográfico – ${photoReportViewLabels[page.view]}`;
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Uma página não carregou para impressão. Tente novamente."));
        image.src = page.dataUrl;
        printDocument.body.appendChild(image);
      }));
      await Promise.all(imageLoads);
      if (current !== generation.current || !iframe.isConnected) {
        cleanup();
        return;
      }
      printWindow.addEventListener("afterprint", cleanup, { once: true });
      printWindow.focus();
      printWindow.print();
    } catch (failure) {
      cleanup();
      if (current === generation.current) {
        setError(failure instanceof Error ? failure.message : "Não foi possível imprimir o relatório.");
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void load();
        else {
          releaseResources();
          setPages([]);
          setLoading(false);
          setAction(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={!patientName.trim()} className="gap-2">
          <Images className="h-4 w-4" />
          Relatório fotográfico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Relatório fotográfico de evolução</DialogTitle>
          <DialogDescription>
            {patientName} · Fotos salvas de antes e depois, com datas e identificação profissional.
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando fotografias em alta resolução...
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && !error && !pages.length && (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhuma foto salva nesta avaliação. Adicione as fotos antes de gerar o relatório.
          </p>
        )}
        {!loading && pages.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">A4 · {pages.length} página(s) · Uso clínico privado</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={Boolean(action)} onClick={() => void print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  {action === "print" ? "Preparando..." : "Imprimir"}
                </Button>
                <Button type="button" disabled={Boolean(action)} onClick={download} className="bg-[#2f8f82] hover:bg-[#26796e]">
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
            <div className="space-y-4 rounded-lg bg-slate-100 p-3">
              {pages.map((page) => (
                <img
                  key={page.view}
                  src={page.dataUrl}
                  alt={`Página ${photoReportViewLabels[page.view]} com fotos antes e depois de ${patientName}`}
                  className="h-auto w-full border border-slate-200 bg-white shadow-sm"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">Guarde o arquivo em local seguro. Este relatório contém fotografias clínicas privadas.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
