'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PostPreview = {
  id: string
  title: string
  slug: string
  published: boolean
  created_at: string
}

export default function BlogTableManager({ initialPosts }: { initialPosts: PostPreview[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const togglePublish = async (id: string, currentStatus: boolean) => {
    setIsProcessing(id)
    await supabase.from('posts').update({ published: !currentStatus }).eq('id', id)
    setIsProcessing(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post forever?')) return
    setIsProcessing(id)
    await supabase.from('posts').delete().eq('id', id)
    setIsProcessing(null)
    router.refresh()
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Created Date</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {initialPosts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No posts yet. Time to start writing!
                </td>
              </tr>
            ) : (
              initialPosts.map(post => (
                <tr key={post.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium max-w-xs truncate">{post.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${post.published ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                      onClick={() => togglePublish(post.id, post.published)}
                      disabled={isProcessing === post.id}
                      className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                      {post.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      disabled={isProcessing === post.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
