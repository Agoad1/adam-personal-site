'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

type ShiftLog = {
  date: string
  income: number | null
}

type Props = {
  logs: ShiftLog[]
}

function groupByWeek(logs: ShiftLog[]) {
  const map = new Map<string, number>()
  for (const log of logs) {
    const d = new Date(log.date + 'T12:00:00')
    // Get Monday of the week
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    const key = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    map.set(key, (map.get(key) || 0) + (log.income || 0))
  }
  return Array.from(map.entries()).map(([week, income]) => ({ week, income: +income.toFixed(2) }))
}

function groupByMonth(logs: ShiftLog[]) {
  const map = new Map<string, number>()
  for (const log of logs) {
    const d = new Date(log.date + 'T12:00:00')
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    map.set(key, (map.get(key) || 0) + (log.income || 0))
  }
  return Array.from(map.entries()).map(([month, income]) => ({ month, income: +income.toFixed(2) }))
}

export default function EarningsChart({ logs }: Props) {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly')

  const weeklyData = groupByWeek(logs)
  const monthlyData = groupByMonth(logs)
  const data: { label: string; income: number }[] = view === 'weekly'
    ? weeklyData.map(d => ({ label: d.week, income: d.income }))
    : monthlyData.map(d => ({ label: d.month, income: d.income }))
  const dataKey = 'label'

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">Earnings History</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('weekly')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >Weekly</button>
          <button
            onClick={() => setView('monthly')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >Monthly</button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey={dataKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Earned']}
              contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="income" fill="url(#earningsGrad)" radius={[4, 4, 0, 0]} />
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
