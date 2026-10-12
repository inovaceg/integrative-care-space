import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createSeoHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

type Post = { title: string; slug: string; content: string; excerpt: string | null; image_url: string | null; category: string | null; author_display_name: string | null; published_at: string | null; created_at: string };
export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const requestedSlug = decodeURIComponent(params.slug).trim();
    const { data, error } = await supabase.from("blog_posts").select("title,slug,content,excerpt,image_url,category,author_display_name,published_at,created_at").eq("status", "published");
    const post = !error ? (data as Post[] | null)?.find((item) => item.slug.trim() === requestedSlug) : null;
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => createSeoHead({ title: `${loaderData?.title ?? "Artigo"} | Blog`, description: loaderData?.excerpt ?? "Leia este artigo no blog do Dr. Frederick.", path: `/blog/${loaderData?.slug ?? ""}` }),
  component: ArticlePage,
});
function ArticlePage() { const post = Route.useLoaderData(); return <main className="container-site py-12 sm:py-20"><Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#26786e] hover:underline"><ArrowLeft className="size-4" /> Voltar ao blog</Link><article className="mx-auto mt-10 max-w-4xl">{post.image_url && <img src={post.image_url} alt="" className="mb-10 max-h-[28rem] w-full rounded-3xl object-cover" />}<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f8f82]">{post.category ?? "Artigo"}</p><h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-6xl">{post.title}</h1><p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="size-4" />{new Date(post.published_at ?? post.created_at).toLocaleDateString("pt-BR")} {post.author_display_name && `· ${post.author_display_name}`}</p>{post.excerpt && <p className="mt-10 border-l-4 border-[#72c7b5] pl-5 text-xl leading-8 text-slate-600">{post.excerpt}</p>}<div className="mt-10 max-w-none whitespace-pre-line text-base leading-8 text-slate-700">{post.content}</div></article></main>; }
