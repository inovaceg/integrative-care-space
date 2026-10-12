import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Facebook, Link2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Comment = { id: string; author_name: string; content: string; created_at: string };

export function BlogEngagement({ slug, title }: { slug: string; title: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const articleUrl = typeof window !== "undefined" ? `${window.location.origin}/blog/${encodeURIComponent(slug)}` : "";

  useEffect(() => {
    void supabase.from("blog_comments").select("id,author_name,content,created_at").eq("post_slug", slug).order("created_at", { ascending: false }).then(({ data }) => setComments((data as Comment[] | null) ?? []));
  }, [slug]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanContent = content.trim();
    if (cleanName.length < 2 || cleanContent.length < 2) { setMessage("Digite seu nome e um comentário."); return; }
    const { data, error } = await supabase.from("blog_comments").insert({ post_slug: slug, author_name: cleanName, content: cleanContent }).select("id,author_name,content,created_at").single();
    if (error) { setMessage("Não foi possível enviar agora. Tente novamente."); return; }
    setComments((current) => [data as Comment, ...current]);
    setName(""); setContent(""); setMessage("Comentário publicado. Obrigado por participar!");
  }

  function share(url: string) { window.open(url, "_blank", "noopener,noreferrer"); }
  async function copyLink() { await navigator.clipboard.writeText(articleUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }

  return <section className="mt-16 border-t border-slate-200 pt-10" aria-label="Compartilhe e comente">
    <div className="flex flex-col gap-5 rounded-3xl bg-[#f3f8f7] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f8f82]">Espalhe conhecimento</p><h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">Gostou deste conteúdo?</h2><p className="mt-2 text-slate-600">Compartilhe esta notícia com quem pode se beneficiar dela.</p></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="icon" aria-label="Compartilhar no WhatsApp" onClick={() => share(`https://wa.me/?text=${encodeURIComponent(`${title} ${articleUrl}`)}`)}><MessageCircle /></Button><Button type="button" variant="outline" size="icon" aria-label="Compartilhar no Facebook" onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`)}><Facebook /></Button><Button type="button" variant="outline" size="icon" aria-label="Copiar link" onClick={() => void copyLink()}>{copied ? <Check /> : <Link2 />}</Button></div>
    </div>
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <div><div className="flex items-center gap-3"><MessageCircle className="size-5 text-[#2f8f82]" /><h2 className="font-display text-2xl font-semibold text-slate-900">Comentários ({comments.length})</h2></div>{comments.length ? <div className="mt-6 space-y-4">{comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-4"><strong className="text-slate-900">{comment.author_name}</strong><time className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString("pt-BR")}</time></div><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{comment.content}</p></article>)}</div> : <p className="mt-5 text-slate-500">Seja a primeira pessoa a comentar.</p>}</div>
      <form onSubmit={submitComment} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-display text-xl font-semibold text-slate-900">Deixe seu comentário</h3><div className="mt-5 space-y-4"><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Seu nome" aria-label="Seu nome" required /><Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="Escreva sua mensagem..." aria-label="Comentário" required /><Button type="submit" className="w-full"><Send /> Publicar comentário</Button>{message && <p className="text-sm text-slate-500" role="status">{message}</p>}</div></form>
    </div>
  </section>;
}
