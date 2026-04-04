'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  stack: string[] | null
  github_url: string | null
  live_url: string | null
  image_url: string | null
  featured: boolean
  created_at: string
}

export default function PortfolioManager({ initialItems }: { initialItems: PortfolioItem[] }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    stack: '',
    github_url: '',
    live_url: '',
    image_url: '',
    featured: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const stackArray = formData.stack ? formData.stack.split(',').map(s => s.trim()) : []
    
    await supabase.from('portfolio').insert([{
      title: formData.title,
      description: formData.description || null,
      category: formData.category || null,
      stack: stackArray,
      github_url: formData.github_url || null,
      live_url: formData.live_url || null,
      image_url: formData.image_url || null,
      featured: formData.featured,
    }])
    
    setIsSubmitting(false)
    setFormData({
      title: '', description: '', category: '', stack: '', github_url: '', live_url: '', image_url: '', featured: false
    })
    
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    setIsProcessing(id)
    await supabase.from('portfolio').delete().eq('id', id)
    setIsProcessing(null)
    router.refresh()
  }

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    setIsProcessing(id)
    await supabase.from('portfolio').update({ featured: !currentStatus }).eq('id', id)
    setIsProcessing(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* ADD ITEM FORM */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white mb-6">Add New Project or Link</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Category</label>
              <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Workflow, Frontend, Resume"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-y" />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tech Stack (comma separated)</label>
            <input type="text" name="stack" value={formData.stack} onChange={handleChange} placeholder="React, Tailwind, Supabase"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Live URL</label>
              <input type="text" name="live_url" value={formData.live_url} onChange={handleChange} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">GitHub URL</label>
              <input type="text" name="github_url" value={formData.github_url} onChange={handleChange} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Image URL</label>
              <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="featured" name="featured" checked={formData.featured} onChange={handleChange} 
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500/50" />
            <label htmlFor="featured" className="text-sm text-zinc-300">Feature this project prominently</label>
          </div>

          <button disabled={isSubmitting} type="submit" 
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            {isSubmitting ? 'Saving...' : 'Add to Portfolio'}
          </button>
        </form>
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Project Title</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-center">Featured</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    No portfolio items yet.
                  </td>
                </tr>
              ) : (
                initialItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.title}</td>
                    <td className="px-6 py-4 text-zinc-400">{item.category || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleFeatured(item.id, item.featured)}
                        disabled={isProcessing === item.id}
                        className={`text-xl ${item.featured ? 'text-yellow-500 hover:text-yellow-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                      >
                        ★
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={isProcessing === item.id}
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
    </div>
  )
}
