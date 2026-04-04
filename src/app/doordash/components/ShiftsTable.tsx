'use client'

import { useState } from 'react'

type Delivery = {
  id: string
  restaurant_name: string | null
  amount: number | null
}

type ShiftLog = {
  id: string
  date: string
  income: number | null
  hours: number | null
  miles: number | null
  expenses: number | null
  trips: number | null
  notes: string | null
  doordash_deliveries?: Delivery[]
}

type Props = {
  logs: ShiftLog[]
}

export default function ShiftsTable({ logs }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (logs.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="font-serif text-slate-600">No shifts logged yet.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-slate-200/60">
        <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">All Shifts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Income</th>
              <th className="px-5 py-3 font-semibold">Net</th>
              <th className="px-5 py-3 font-semibold">Hours</th>
              <th className="px-5 py-3 font-semibold">Miles</th>
              <th className="px-5 py-3 font-semibold">Trips</th>
              <th className="px-5 py-3 font-semibold">$/hr</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {logs.map(log => {
              const net = (log.income || 0) - (log.expenses || 0)
              const perHour = log.hours && log.hours > 0 ? (log.income || 0) / log.hours : null
              const deliveries = log.doordash_deliveries || []
              const isOpen = expanded.has(log.id)

              return (
                <>
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 font-bold text-green-700">${log.income?.toFixed(2) || '—'}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">${net.toFixed(2)}</td>
                    <td className="px-5 py-3 text-slate-600">{log.hours?.toFixed(2) || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{log.miles || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{log.trips || '—'}</td>
                    <td className="px-5 py-3 text-blue-600 font-semibold">{perHour ? `$${perHour.toFixed(2)}` : '—'}</td>
                    <td className="px-5 py-3">
                      {deliveries.length > 0 && (
                        <button onClick={() => toggle(log.id)}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                          {isOpen ? '▲ Hide' : `▼ ${deliveries.length} stops`}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && deliveries.length > 0 && (
                    <tr key={`${log.id}-deliveries`} className="bg-slate-50/40">
                      <td colSpan={8} className="px-8 py-3">
                        <div className="space-y-1">
                          {deliveries.map(d => (
                            <div key={d.id} className="flex items-center justify-between text-xs text-slate-600 max-w-sm">
                              <span className="font-medium">{d.restaurant_name || 'Unknown'}</span>
                              <span className="text-green-600 font-semibold">${d.amount?.toFixed(2) || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
