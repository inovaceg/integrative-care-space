import { createFileRoute } from "@tanstack/react-router";
import ProtocolsPage from "@/components/admin/protocols/protocols-page";

export const Route = createFileRoute("/admin/protocolos")({
  head: () => ({ meta: [{ title: "Protocolos | Área Administrativa" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ProtocolsPage,
});
