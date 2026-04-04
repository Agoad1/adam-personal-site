'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type DoordashLog = {
  id: string
  date: string
  income: number | null
  miles: number | null
  expenses: number | null
  hours: number | null
  notes: string | null
}

export default function DoordashManager({ initialLogs }: { initialLogs: DoordashLog[] }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    income: '',
    miles: '',
    expenses: '',
    hours: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    await supabase.from('doordash_logs').insert([{
      date: formData.date,
      income: formData.income ? parseFloat(formData.income) : null,
      miles: formData.miles ? parseFloat(formData.miles) : null,
      expenses: formData.expenses ? parseFloat(formData.expenses) : null,
      hours: formData.hours ? parseFloat(formData.hours) : null,
      notes: formData.notes || null
    }])
    
    setIsSubmitting(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      income: '',
      miles: '',
      expenses: '',
      hours: '',
      notes: '',
    })
    
    router.refresh() // Refresh server component data
  }

  // Calculate quick totals for visual
  const totalIncome = initialLogs.reduce((acc, log) => acc + (log.income || 0), 0)
  const totalHours = initialLogs.reduce((acc, log) => acc + (log.hours || 0), 0)

  return (
    <div className="space-y-8">
      {/* Visual Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-400">Total Recent Income</h3>
          <p className="text-3xl font-bold text-white mt-2">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-400">Total Recent Hours</h3>
          <p className="text-3xl font-bold text-white mt-2">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-400">Avg Hourly</h3>
          <p className="text-3xl font-bold text-blue-400 mt-2">
            ${totalHours > 0 ? (totalIncome / totalHours).toFixed(2) : '0.00'} / hr
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ADD LOG FORM */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-xl font-bold text-white mb-6">Log New Shift</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Income ($)</label>
                <input type="number" step="0.01" name="income" value={formData.income} onChange={handleChange} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Hours</label>
                <input type="number" step="0.1" name="hours" value={formData.hours} onChange={handleChange} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Miles</label>
                <input type="number" step="0.1" name="miles" value={formData.miles} onChange={handleChange} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Expenses ($)</label>
                <input type="number" step="0.01" name="expenses" value={formData.expenses} onChange={handleChange} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" />
            </div>

            <button disabled={isSubmitting} type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors mt-2">
              {isSubmitting ? 'Saving...' : 'Save Log'}
            </button>
          </form>
        </div>

        {/* LOGS TABLE VIEW */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Recent Logs</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Income</th>
                    <th className="px-6 py-4 font-medium">Hours</th>
                    <th className="px-6 py-4 font-medium">Miles</th>
                    <th className="px-6 py-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {initialLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        No progress logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    initialLogs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-green-400">${log.income?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4">{log.hours || '-'}</td>
                        <td className="px-6 py-4">{log.miles || '-'}</td>
                        <td className="px-6 py-4 text-zinc-400 truncate max-w-[150px]">{log.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
