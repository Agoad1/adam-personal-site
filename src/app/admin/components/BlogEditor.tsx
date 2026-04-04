'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BlogEditor() {
  const supabase = createClient()
  const router = useRouter()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    tags: '',
  })

  // Auto-generate slug from title if empty
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug === '' ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault()
    if (!formData.title || !formData.slug) return alert('Title and Slug are required')
    
    setIsSubmitting(true)

    const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
    
    const { error } = await supabase.from('posts').insert([{
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content: formData.content,
      tags: tagsArray,
      published: publish,
    }])
    
    setIsSubmitting(false)

    if (error) {
      alert(`Error saving post: ${error.message}`)
    } else {
      router.push('/admin/blog')
      router.refresh()
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleTitleChange} required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL Slug *</label>
            <input type="text" name="slug" value={formData.slug} onChange={handleChange} required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Excerpt</label>
          <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-y" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Markdown Content</label>
          <textarea name="content" value={formData.content} onChange={handleChange} rows={15}
            className="w-full font-mono text-sm bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-4 text-zinc-300 focus:ring-2 focus:ring-blue-500/50 outline-none resize-y" 
            placeholder="# Your heading here..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (comma separated)</label>
          <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="react, nextjs, tutorial"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition"
          >
            Save as Draft
          </button>
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Publish Now
          </button>
        </div>
      </form>
    </div>
  )
}
