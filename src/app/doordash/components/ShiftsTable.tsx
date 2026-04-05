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
        <p className="font-serif text-black/50">No shifts logged yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-serif text-sm font-bold text-black uppercase tracking-wider mb-3">All Logs</h3>
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-black uppercase text-xs tracking-wider">
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
            <tbody className="divide-y divide-slate-100 text-black">
              {logs.map(log => {
                const net = (log.income || 0) - (log.expenses || 0)
                const perHour = log.hours && log.hours > 0 ? (log.income || 0) / log.hours : null
                const deliveries = log.doordash_deliveries || []
                const isOpen = expanded.has(log.id)
                const isWeek = !log.log_type || log.log_type === 'week'

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-black">
                        {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        {isWeek ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            WEEK
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                            SESSION
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-bold text-green-600">${log.income?.toFixed(2) ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-black">${net.toFixed(2)}</td>
                      <td className="px-5 py-3 text-black/60">{log.hours != null ? log.hours : '—'}</td>
                      <td className="px-5 py-3 text-black/60">{log.miles != null ? log.miles : '—'}</td>
                      <td className="px-5 py-3 text-black/60">{log.trips != null ? log.trips : '—'}</td>
                      <td className="px-5 py-3 text-blue-600 font-semibold">{perHour ? `$${perHour.toFixed(2)}` : '—'}</td>
                      <td className="px-5 py-3">
                        {deliveries.length > 0 && (
                          <button
                            onClick={() => toggle(log.id)}
                            className="text-xs text-black hover:text-black/60 font-medium transition-colors"
                          >
                            {isOpen ? '▲ Hide' : `▼ ${deliveries.length} stops`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && deliveries.length > 0 && (
                      <tr className="bg-slate-50">
                        <td colSpan={9} className="px-10 py-3">
                          <div className="space-y-1.5">
                            {deliveries.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs text-black/60 max-w-sm">
                                <span className="font-medium text-black">{d.restaurant_name || 'Unknown'}</span>
                                <span className="text-green-600 font-semibold">${d.amount?.toFixed(2) ?? '—'}</span>
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
