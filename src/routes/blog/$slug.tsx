import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { PageIntro } from "@/components/page-parts";
import { fetchPublishedPosts, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({ component: BlogPostPage });
function BlogPostPage() {
  const { slug } = Route.useParams(); const [post, setPost] = useState<BlogPost | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchPublishedPosts().then(({ data }) => setPost(((data as BlogPost[] | null) ?? []).find(item => item.slug === slug) ?? null)).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <PageIntro eyebrow="Conteúdo" title="Carregando artigo" text="" />;
  if (!post) return <section className="section-space"><div className="container-site"><p>Artigo não encontrado.</p><Link to="/blog" className="mt-4 inline-flex text-[#2f8f82]">Voltar ao blog</Link></div></section>;
  return <article className="section-space"><div className="container-site max-w-3xl"><Link to="/blog" className="inline-flex items-center gap-2 text-sm text-[#2f8f82]"><ArrowLeft className="size-4" /> Voltar ao blog</Link><p className="mt-8 text-xs font-semibold uppercase tracking-wider text-[#2f8f82]">{post.category ?? "Saúde e bem-estar"}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{post.title}</h1>{post.excerpt && <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>}{post.image_url && <img src={post.image_url} alt="" className="mt-8 max-h-[28rem] w-full rounded-2xl object-cover" />}<div className="mt-10 whitespace-pre-wrap text-base leading-8 text-slate-700">{post.content}</div></div></article>;
}
