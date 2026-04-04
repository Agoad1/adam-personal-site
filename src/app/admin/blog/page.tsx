import { createServiceClient } from '@/lib/supabase/server'
import BlogTableManager from '@/app/admin/components/BlogTableManager'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function BlogAdminPage() {
  const supabase = await createServiceClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, published, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Blog Engine</h1>
          <p className="text-zinc-400">Manage your published articles and drafts.</p>
        </div>
        <Link 
          href="/admin/blog/new"
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>✏️</span> Write New Post
        </Link>
      </div>

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400">
          Failed to load posts.
        </div>
      ) : (
        <BlogTableManager initialPosts={posts || []} />
      )}
    </div>
  )
}
