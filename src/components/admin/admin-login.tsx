import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminBrandMark, AdminNotice } from "./admin-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading, signIn, resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (isAdmin) {
      void navigate({ to: "/admin/dashboard", replace: true });
    } else if (loginPending) {
      setLoginPending(false);
      setErrorMessage("Este usuário não tem permissão para acessar a área administrativa.");
    }
  }, [isAdmin, isLoading, loginPending, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);
    setSubmitting(true);

    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setErrorMessage("Não foi possível entrar. Verifique o e-mail e a senha.");
      return;
    }

    setLoginPending(true);
  }

  async function handleRecovery() {
    setErrorMessage(null);
    setFeedback(null);
    if (!email) {
      setErrorMessage("Informe seu e-mail profissional para solicitar a recuperação.");
      return;
    }

    setRecoveryLoading(true);
    const { error } = await resetPasswordForEmail(email);
    setRecoveryLoading(false);
    setFeedback(
      error
        ? "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde."
        : "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.",
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f7] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <AdminBrandMark />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#2f8f82]">Área administrativa</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-900">Bem-vindo ao seu painel</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Um espaço reservado para organizar sua rotina de atendimentos.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#2f8f82]" />
            <p>O acesso é protegido pelo Supabase Auth e requer uma conta administrativa autorizada.</p>
          </div>
          <form className="grid gap-5" onSubmit={handleSubmit} aria-busy={submitting || isLoading}>
            <div className="grid gap-2">
              <Label htmlFor="admin-email" className="text-sm font-medium text-slate-700">E-mail profissional</Label>
              <Input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@exemplo.com" autoComplete="email" className="h-11 border-slate-200 bg-white" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password" className="text-sm font-medium text-slate-700">Senha</Label>
              <Input id="admin-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" className="h-11 border-slate-200 bg-white" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-access" checked={rememberAccess} onCheckedChange={(checked) => setRememberAccess(checked === true)} />
                <Label htmlFor="remember-access" className="text-sm font-normal text-slate-600">Lembrar acesso</Label>
              </div>
              <button type="button" onClick={handleRecovery} disabled={recoveryLoading} className="text-sm text-[#2f8f82] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60">
                {recoveryLoading ? "Enviando..." : "Esqueci minha senha"}
              </button>
            </div>
            {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
            {feedback && <p role="status" className="text-sm text-[#286a60]">{feedback}</p>}
            <Button type="submit" disabled={submitting || isLoading} className="mt-1 h-11 w-full gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]">
              {submitting ? "Entrando..." : "Entrar no painel"}
              {!submitting && <ArrowRight className="size-4" />}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">Sua senha é processada somente pelo Supabase Auth e não é armazenada nesta aplicação.</p>
        </div>
        <AdminNotice />
        <Link to="/" className="mx-auto mt-7 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-[#2f8f82]"><ArrowLeft className="size-4" /> Voltar ao site público</Link>
      </div>
    </main>
  );
}
