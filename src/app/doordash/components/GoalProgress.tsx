'use client'

import { motion } from 'framer-motion'

type Props = {
  monthLabel: string
  earned: number
  target: number
}

export default function GoalProgress({ monthLabel, earned, target }: Props) {
  const pct = Math.min((earned / target) * 100, 100)
  const remaining = Math.max(target - earned, 0)

  return (
    <div className="doordash-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-black uppercase tracking-wider">
            Monthly Goal: {monthLabel}
          </h3>
          <p className="font-mono text-xs font-bold text-black/60 mt-0.5">
            ${earned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${target.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} target
          </p>
        </div>
        <span className="font-mono text-2xl font-bold text-black">{pct.toFixed(0)}%</span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {remaining > 0 ? (
        <p className="font-sans text-xs font-bold text-black/60">
          ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to go
        </p>
      ) : (
        <p className="font-sans text-xs font-bold text-black">Goal reached!</p>
      )}
    </div>
  )
}
