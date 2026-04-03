import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

function readTime(content: string | null): string {
  if (!content) return "1 min read";
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export default async function BlogIndex() {
  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    tags: string[] | null;
    created_at: string;
  }> = [];

  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, content, tags, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (data) posts = data;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="heading-display text-4xl mb-2">Blog</h1>
      <p className="text-text-secondary mb-10">
        Thoughts on AI, automation, building, and the grind.
      </p>

      {posts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary">No posts yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="card block hover:border-accent transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-bold text-text-primary">
                  {post.title}
                </h2>
                <span className="text-xs text-text-secondary whitespace-nowrap">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  &middot; {readTime(post.content)}
                </span>
              </div>
              {post.excerpt && (
                <p className="text-text-secondary mt-2 text-sm">
                  {post.excerpt}
                </p>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-[rgba(59,130,246,0.1)] text-accent border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
