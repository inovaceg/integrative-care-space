import { ManualLetterheadArt } from "./manual-letterhead-art";
import type { DocumentPage } from "@/lib/admin/document-layout";

export function ManualLetterheadPreview({ page }: { page: DocumentPage }) {
  return <ManualLetterheadArt page={page} className="block h-auto w-full bg-white" />;
}
