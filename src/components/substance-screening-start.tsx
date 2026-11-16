import { ArrowLeft, ArrowRight, HeartHandshake, LockKeyhole } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  error: string;
  loading: boolean;
  resumeCode: string;
  setResumeCode: (value: string) => void;
  onStart: () => void;
  onResume: () => void;
};

export function SubstanceScreeningStart({ error, loading, resumeCode, setResumeCode, onStart, onResume }: Props) {
  return <main className="min-h-screen bg-[#f8f6f1] px-4 py-12 text-[#173f3a]"><div className="mx-auto max-w-3xl"><Link to="/" className="inline-flex items-center gap-2 text-sm text-[#17675b]"><ArrowLeft className="size-4"/>Voltar ao site</Link>
    <section className="mt-6 rounded-2xl border-2 border-[#b9cec4] bg-white p-6 shadow-sm sm:p-8"><h1 className="flex items-center gap-2 font-display text-xl font-semibold"><LockKeyhole className="size-5 text-[#26786e]"/>Já começou uma ficha?</h1><p className="mt-2 text-sm leading-6 text-[#526760]">Digite seu código privado para carregar as respostas salvas e continuar sem preencher tudo novamente.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Input aria-label="Código privado de retomada" autoComplete="off" maxLength={36} value={resumeCode} onChange={(event) => setResumeCode(event.target.value)} placeholder="Cole aqui seu código privado"/><Button onClick={onResume} disabled={loading || resumeCode.trim().length !== 36} className="shrink-0 bg-[#17675b] text-white hover:bg-[#12574d]">{loading ? 'Carregando…' : 'Carregar minha ficha'}</Button></div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</section>
    <section className="mt-5 rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><HeartHandshake className="size-6"/></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Acolhimento sem julgamentos</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Triagem inicial sobre uso de substâncias</h2><p className="mt-4 leading-7 text-[#526760]">Este formulário ajuda a organizar informações para uma conversa profissional. Não é diagnóstico e não determina dependência. Você pode responder no seu ritmo; as respostas ficam privadas e são acessíveis apenas à equipe autorizada.</p><div className="mt-5 rounded-2xl bg-[#f4f8f7] p-4 text-sm leading-6 text-[#526760]"><strong className="text-[#173f3a]">Se houver uma emergência agora</strong>, como dificuldade para respirar, perda de consciência, convulsão, suspeita de overdose, risco de suicídio ou violência, ligue para o SAMU 192 ou procure um serviço de emergência. Não espere preencher este formulário.</div><p className="mt-5 text-sm leading-6 text-[#526760]">A triagem é destinada a crianças, adolescentes e adultos. A data de nascimento define o fluxo adequado. Para crianças, o formulário é respondido por um responsável. Em adolescentes, explicaremos os cuidados de privacidade e a participação de responsáveis.</p>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<Button onClick={onStart} disabled={loading} className="mt-6 h-12 rounded-full bg-[#17675b] px-7 text-white hover:bg-[#12574d]">Iniciar minha avaliação <ArrowRight className="ml-2 size-4"/></Button></section><p className="mt-6 text-center text-xs text-[#71817b]">Dr. Frederick Parreira · Psicólogo — CRP 04/86194</p></div></main>;
}
