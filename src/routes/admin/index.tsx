import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@/components/admin/admin-login";

export const Route = createFileRoute("/admin/")({ component: AdminLoginPage });
