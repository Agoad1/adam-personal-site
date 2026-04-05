'use client'

import React, { useState } from 'react'

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
  log_type: string | null
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
      <div className="text-center py-12">
        <p className="font-serif text-slate-500">No shifts logged yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-serif text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">All Logs</h3>
      <div className="rounded-xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Income</th>
                <th className="px-5 py-3 font-semibold">Net</th>
                <th className="px-5 py-3 font-semibold">Hours</th>
                <th className="px-5 py-3 font-semibold">Miles</th>
                <th className="px-5 py-3 font-semibold">Trips</th>
                <th className="px-5 py-3 font-semibold">$/hr</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {logs.map(log => {
                const net = (log.income || 0) - (log.expenses || 0)
                const perHour = log.hours && log.hours > 0 ? (log.income || 0) / log.hours : null
                const deliveries = log.doordash_deliveries || []
                const isOpen = expanded.has(log.id)
                const isWeek = !log.log_type || log.log_type === 'week'

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-200">
                        {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        {isWeek ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            WEEK
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            SESSION
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-bold text-green-400">${log.income?.toFixed(2) ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-300">${net.toFixed(2)}</td>
                      <td className="px-5 py-3 text-slate-400">{log.hours != null ? log.hours : '—'}</td>
                      <td className="px-5 py-3 text-slate-400">{log.miles != null ? log.miles : '—'}</td>
                      <td className="px-5 py-3 text-slate-400">{log.trips != null ? log.trips : '—'}</td>
                      <td className="px-5 py-3 text-blue-400 font-semibold">{perHour ? `$${perHour.toFixed(2)}` : '—'}</td>
                      <td className="px-5 py-3">
                        {deliveries.length > 0 && (
                          <button
                            onClick={() => toggle(log.id)}
                            className="text-xs text-blue-400 hover:text-blue-200 font-medium transition-colors"
                          >
                            {isOpen ? '▲ Hide' : `▼ ${deliveries.length} stops`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && deliveries.length > 0 && (
                      <tr className="bg-white/[0.03]">
                        <td colSpan={9} className="px-10 py-3">
                          <div className="space-y-1.5">
                            {deliveries.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs text-slate-400 max-w-sm">
                                <span className="font-medium text-slate-300">{d.restaurant_name || 'Unknown'}</span>
                                <span className="text-green-400 font-semibold">${d.amount?.toFixed(2) ?? '—'}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
