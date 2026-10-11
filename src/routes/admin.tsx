import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AdminRoute,
});

function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f7] px-4">
      <p className="text-sm text-slate-500">Verificando acesso...</p>
    </main>
  );
}

function AdminRoute() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLogin = pathname === "/admin/login";
  const isIndex = pathname === "/admin" || pathname === "/admin/";

  useEffect(() => {
    if (isLoading) return;
    if (isIndex) {
      void navigate({ to: isAdmin ? "/admin/dashboard" : "/admin/login", replace: true });
    } else if (!isLogin && !isAdmin) {
      void navigate({ to: "/admin/login", replace: true });
    }
  }, [isAdmin, isIndex, isLoading, isLogin, navigate]);

  if (isLoading || isIndex || (!isLogin && !isAdmin)) {
    return <AuthLoading />;
  }

  return <Outlet />;
}
