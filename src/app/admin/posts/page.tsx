import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPosts() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, published, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-display text-2xl">Posts</h1>
        <Link href="/admin/posts/new" className="btn-primary text-sm">
          New Post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-text-secondary">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}`}
              className="card block hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-text-primary">
                    {post.title}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    /{post.slug} &middot;{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    post.published
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
