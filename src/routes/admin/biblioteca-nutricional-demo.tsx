import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/biblioteca-nutricional-demo")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/planejamento-alimentar" });
  },
});
