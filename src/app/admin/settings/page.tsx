'use client'

import { useState } from 'react'

export default function SettingsAdminPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState({
    theme: 'dark',
    heroText: 'Building the next era of digital experiences.',
    fontFamily: 'inter',
    enableAnimations: true
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setConfig(prev => ({ ...prev, [name]: val }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    // Placeholder save delay
    setTimeout(() => {
      setIsSaving(false)
      alert('Settings saved placeholder!')
    }, 800)
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Command Center Settings</h1>
        <p className="text-zinc-400">Global site configuration, themes, and master text blocks.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Site Appearance */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">Appearance & UI</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Active Theme</label>
                <select name="theme" value={config.theme} onChange={handleChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none">
                  <option value="dark">Cinematic Dark Mode</option>
                  <option value="light">Minimalist Light Mode</option>
                  <option value="glass">Glassmorphism Default</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Typography Setup</label>
                <select name="fontFamily" value={config.fontFamily} onChange={handleChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none">
                  <option value="inter">Inter (Clean, Modern)</option>
                  <option value="outfit">Outfit (Tech, Geometric)</option>
                  <option value="serif">Playfair Display (Editorial)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="enableAnimations" name="enableAnimations" checked={config.enableAnimations} onChange={handleChange}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500/50" />
              <label htmlFor="enableAnimations" className="text-sm text-zinc-300">Enable micro-animations globally (Framer Motion)</label>
            </div>
          </div>

          {/* Master Text Configurations */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">Global Content</h2>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Homepage Hero Text</label>
              <textarea name="heroText" value={config.heroText} onChange={handleChange} rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" />
              <p className="text-xs text-zinc-500 mt-1">This text appears front and center on the main landing page.</p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex justify-end">
            <button disabled={isSaving} type="submit" 
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-8 rounded-lg transition-colors">
              {isSaving ? 'Applying...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
