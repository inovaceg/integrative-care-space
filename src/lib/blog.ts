import { supabase } from "@/integrations/supabase/client";

export type BlogStatus = "draft" | "scheduled" | "published";
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  author_id: string;
  author_display_name: string | null;
  status: BlogStatus;
  category: string | null;
  tags: string[];
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const fields = "id,title,slug,content,excerpt,image_url,author_id,author_display_name,status,category,tags,scheduled_at,published_at,created_at,updated_at";

export async function fetchPublishedPosts() {
  return supabase.from("blog_posts").select(fields).eq("status", "published").or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`).order("published_at", { ascending: false }).order("created_at", { ascending: false });
}

export async function fetchBlogPosts() {
  return supabase.from("blog_posts").select(fields).order("updated_at", { ascending: false });
}

export async function saveBlogPost(authorId: string, input: Omit<BlogPost, "id" | "author_id" | "created_at" | "updated_at">, id?: string) {
  const payload = { ...input, author_id: authorId, updated_at: new Date().toISOString(), published_at: input.status === "published" ? input.published_at ?? new Date().toISOString() : null };
  const query = id ? supabase.from("blog_posts").update(payload).eq("id", id).eq("author_id", authorId) : supabase.from("blog_posts").insert(payload);
  return query.select(fields).single();
}

export async function deleteBlogPost(authorId: string, id: string) {
  return supabase.from("blog_posts").delete().eq("id", id).eq("author_id", authorId);
}

export function postPath(post: Pick<BlogPost, "slug">) { return `/blog/${post.slug}`; }
