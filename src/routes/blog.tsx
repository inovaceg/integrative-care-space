import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PageIntro } from "@/components/page-parts";
import { createSeoHead } from "@/lib/seo";
import { fetchPublishedPosts, postPath, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/blog")({ head: () => createSeoHead({ title: "Blog sobre Saúde Mental e Bem-estar | Dr. Frederick", description: "Conteúdo editorial responsável sobre saúde mental, biomedicina integrativa, estética e qualidade de vida.", path: "/blog" }), component: BlogPage });

function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchPublishedPosts().then(({ data }) => setPosts((data as BlogPost[] | null) ?? [])).finally(() => setLoading(false)); }, []);
  return <><PageIntro eyebrow="Conteúdo" title="Informação para escolhas mais conscientes" text="Artigos responsáveis sobre saúde mental, saúde integrativa, estética e bem-estar." /><section className="section-space"><div className="container-site">{loading ? <p className="text-muted-foreground">Carregando artigos...</p> : posts.length ? <div className="grid gap-6 md:grid-cols-2">{posts.map(post => <article key={post.id} className="content-card overflow-hidden">{post.image_url ? <img src={post.image_url} alt="" className="h-52 w-full object-cover" /> : <div className="grid h-40 place-items-center bg-[#eaf5f2]"><BookOpen className="size-10 text-[#2f8f82]" /></div>}<div className="p-6"><p className="text-xs font-semibold uppercase tracking-wider text-[#2f8f82]">{post.category ?? "Saúde e bem-estar"}</p><h2 className="card-title mt-2 text-2xl">{post.title}</h2>{post.excerpt && <p className="mt-3 leading-7 text-muted-foreground">{post.excerpt}</p>}<Link to={postPath(post)} className="mt-5 inline-flex items-center gap-2 font-semibold text-[#2f8f82]">Ler artigo <ArrowRight className="size-4" /></Link></div></article>)}</div> : <div className="content-card grid min-h-72 place-items-center border-dashed text-center"><div><BookOpen className="mx-auto size-10 text-[#2f8f82]" /><h2 className="card-title mt-5 text-3xl">Artigos em preparação</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Os conteúdos aparecerão aqui quando forem revisados e publicados.</p></div></div>}</div></section></>;
}
