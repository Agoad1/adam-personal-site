import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import MarkdownRenderer from "@/components/MarkdownRenderer";

function readTime(content: string | null): string {
  if (!content) return "1 min read";
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createServiceClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link
        href="/blog"
        className="text-sm text-accent hover:underline mb-6 inline-block"
      >
        &larr; Back to Blog
      </Link>

      <h1 className="heading-display text-4xl sm:text-5xl mb-4">
        {post.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-text-secondary mb-8">
        <span>
          {new Date(post.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span>&middot;</span>
        <span>{readTime(post.content)}</span>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {post.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full bg-[rgba(59,130,246,0.1)] text-accent border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <article className="prose-custom">
        <MarkdownRenderer content={post.content || ""} />
      </article>
    </div>
  );
}
