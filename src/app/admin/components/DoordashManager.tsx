'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type DoordashLog = {
  id: string
  date: string
  income: number | null
  miles: number | null
  expenses: number | null
  hours: number | null
  trips: number | null
  notes: string | null
}

type ParsedDelivery = {
  restaurant_name: string
  amount: number
}

type ParsedResult = {
  date: string | null
  income: number | null
  active_hours: number | null
  dash_hours: number | null
  offers: number | null
  trips: number | null
  deliveries: ParsedDelivery[]
}

export default function DoordashManager({ initialLogs }: { initialLogs: DoordashLog[] }) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'manual' | 'screenshot' | 'goals'>('manual')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manual form state
  const [manualLogType, setManualLogType] = useState<'week' | 'session'>('week')
  const [screenshotLogType, setScreenshotLogType] = useState<'week' | 'session'>('session')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    income: '',
    miles: '',
    expenses: '',
    hours: '',
    trips: '',
    notes: '',
  })

  // Screenshot tab state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [parsedMiles, setParsedMiles] = useState('')
  const [parsedDeliveries, setParsedDeliveries] = useState<ParsedDelivery[]>([])

  // Goals tab state
  const [goalMonth, setGoalMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [goalTarget, setGoalTarget] = useState('')
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)

  const totalIncome = initialLogs.reduce((acc, log) => acc + (log.income || 0), 0)
  const totalHours = initialLogs.reduce((acc, log) => acc + (log.hours || 0), 0)

  // --- Manual form ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await supabase.from('doordash_logs').insert([{
      date: formData.date,
      income: formData.income ? parseFloat(formData.income) : null,
      miles: formData.miles ? parseFloat(formData.miles) : null,
      expenses: formData.expenses ? parseFloat(formData.expenses) : null,
      hours: formData.hours ? parseFloat(formData.hours) : null,
      trips: formData.trips ? parseInt(formData.trips) : null,
      notes: formData.notes || null,
      log_type: manualLogType,
    }])
    setIsSubmitting(false)
    setFormData({ date: new Date().toISOString().split('T')[0], income: '', miles: '', expenses: '', hours: '', trips: '', notes: '' })
    router.refresh()
  }

  // --- Screenshot tab ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setParsed(null)
    setParseError(null)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  const handleParse = async () => {
    if (!imageFile) return
    setIsParsing(true)
    setParseError(null)
    setParsed(null)

    const fd = new FormData()
    fd.append('image', imageFile)

    const res = await fetch('/api/doordash/parse-screenshot', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok || data.error) {
      setParseError(data.error || 'Parse failed')
    } else {
      setParsed(data)
      setParsedMiles('')
      setParsedDeliveries(data.deliveries || [])
    }
    setIsParsing(false)
  }

  const handleConfirmSave = async () => {
    if (!parsed) return
    setIsSubmitting(true)

    const { data: logData } = await supabase.from('doordash_logs').insert([{
      date: parsed.date,
      income: parsed.income,
      miles: parsedMiles ? parseFloat(parsedMiles) : null,
      expenses: null,
      hours: parsed.active_hours,
      trips: parsed.trips,
      notes: `Active: ${parsed.active_hours}h / Dash: ${parsed.dash_hours}h`,
      log_type: screenshotLogType,
    }]).select('id').single()

    if (logData?.id && parsedDeliveries.length > 0) {
      await supabase.from('doordash_deliveries').insert(
        parsedDeliveries.map(d => ({
          session_id: logData.id,
          restaurant_name: d.restaurant_name,
          amount: d.amount,
        }))
      )
    }

    setIsSubmitting(false)
    setParsed(null)
    setImagePreview(null)
    setImageFile(null)
    setParsedDeliveries([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  // --- Goals tab ---
  const handleGoalSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingGoal(true)
    setGoalSaved(false)
    await supabase.from('doordash_goals').upsert([{
      month: goalMonth,
      target_income: parseFloat(goalTarget),
    }], { onConflict: 'month' })
    setIsSavingGoal(false)
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400">Total Recent Income</h3>
          <p className="text-3xl font-bold text-white mt-2">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400">Total Recent Hours</h3>
          <p className="text-3xl font-bold text-white mt-2">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400">Avg Hourly</h3>
          <p className="text-3xl font-bold text-blue-400 mt-2">
            ${totalHours > 0 ? (totalIncome / totalHours).toFixed(2) : '0.00'} / hr
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {(['manual', 'screenshot', 'goals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'manual' ? 'Manual Entry' : tab === 'screenshot' ? 'Upload Screenshot' : 'Monthly Goals'}
          </button>
        ))}
      </div>

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit">
            <h2 className="text-xl font-bold text-white mb-4">Log New Shift</h2>

            {/* Log type toggle */}
            <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 mb-6">
              {(['week', 'session'] as const).map(t => (
                <button key={t} type="button" onClick={() => setManualLogType(t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${manualLogType === t ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                  {t === 'week' ? '📅 Weekly Summary' : '🚗 Single Session'}
                </button>
              ))}
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  {manualLogType === 'week' ? 'Week Starting (Monday)' : 'Date'}
                </label>
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
                  <label className="block text-sm text-zinc-400 mb-1">Active Hours</label>
                  <input type="number" step="0.01" name="hours" value={formData.hours} onChange={handleChange}
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
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Deliveries</label>
                  <input type="number" step="1" name="trips" value={formData.trips} onChange={handleChange}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" />
              </div>
              <button disabled={isSubmitting} type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
                {isSubmitting ? 'Saving...' : 'Save Log'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
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
                      <th className="px-6 py-4 font-medium">Trips</th>
                      <th className="px-6 py-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-200">
                    {initialLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No logs yet.</td>
                      </tr>
                    ) : initialLogs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">{new Date(log.date + 'T12:00:00').toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-green-400">${log.income?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4">{log.hours || '-'}</td>
                        <td className="px-6 py-4">{log.miles || '-'}</td>
                        <td className="px-6 py-4">{log.trips || '-'}</td>
                        <td className="px-6 py-4 text-zinc-400 truncate max-w-[150px]">{log.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Upload Tab */}
      {activeTab === 'screenshot' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload + Parse */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Upload DoorDash Screenshot</h2>
            <p className="text-sm text-zinc-400">Upload your dash summary screen. AI will extract income, time, deliveries, and more.</p>

            <div
              className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative w-full aspect-[9/16] max-h-80 mx-auto">
                  <Image src={imagePreview} alt="Screenshot preview" fill className="object-contain rounded-lg" />
                </div>
              ) : (
                <div className="text-zinc-500 space-y-2">
                  <div className="text-4xl">📸</div>
                  <p className="text-sm">Click to select screenshot</p>
                  <p className="text-xs">JPG, PNG, WEBP, HEIC</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            {imageFile && !parsed && (
              <button onClick={handleParse} disabled={isParsing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
                {isParsing ? 'Parsing with AI...' : 'Parse with AI'}
              </button>
            )}

            {parseError && (
              <p className="text-red-400 text-sm bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">{parseError}</p>
            )}
          </div>

          {/* Parsed Result Form */}
          {parsed && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Review & Confirm</h2>
              <p className="text-sm text-zinc-400">Edit any fields before saving.</p>

              {/* Log type toggle */}
              <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                {(['session', 'week'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setScreenshotLogType(t)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${screenshotLogType === t ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                    {t === 'week' ? '📅 Weekly Summary' : '🚗 Single Session'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Date</label>
                  <input type="date" value={parsed.date || ''} onChange={e => setParsed(p => p ? { ...p, date: e.target.value } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Income ($)</label>
                  <input type="number" step="0.01" value={parsed.income ?? ''} onChange={e => setParsed(p => p ? { ...p, income: parseFloat(e.target.value) } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Active Hours</label>
                  <input type="number" step="0.01" value={parsed.active_hours ?? ''} onChange={e => setParsed(p => p ? { ...p, active_hours: parseFloat(e.target.value) } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Dash Hours</label>
                  <input type="number" step="0.01" value={parsed.dash_hours ?? ''} onChange={e => setParsed(p => p ? { ...p, dash_hours: parseFloat(e.target.value) } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Miles (manual)</label>
                  <input type="number" step="0.1" value={parsedMiles} onChange={e => setParsedMiles(e.target.value)}
                    placeholder="Enter miles"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Deliveries</label>
                  <input type="number" step="1" value={parsed.trips ?? ''} onChange={e => setParsed(p => p ? { ...p, trips: parseInt(e.target.value) } : p)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>

              {parsedDeliveries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Individual Deliveries</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {parsedDeliveries.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={d.restaurant_name}
                          onChange={e => setParsedDeliveries(prev => prev.map((x, j) => j === i ? { ...x, restaurant_name: e.target.value } : x))}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-white text-xs outline-none"
                        />
                        <input
                          type="number" step="0.01" value={d.amount}
                          onChange={e => setParsedDeliveries(prev => prev.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) } : x))}
                          className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-white text-xs outline-none"
                        />
                        <button onClick={() => setParsedDeliveries(prev => prev.filter((_, j) => j !== i))}
                          className="text-zinc-500 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleConfirmSave} disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Set Monthly Goal</h2>
            <p className="text-sm text-zinc-400 mb-6">Set a monthly income target. This will appear as a progress bar on the public tracker page.</p>
            <form onSubmit={handleGoalSave} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Month</label>
                <input type="month" value={goalMonth} onChange={e => setGoalMonth(e.target.value)} required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Income Target ($)</label>
                <input type="number" step="0.01" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} required
                  placeholder="e.g. 1500.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <button disabled={isSavingGoal} type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
                {isSavingGoal ? 'Saving...' : goalSaved ? '✓ Saved!' : 'Save Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
