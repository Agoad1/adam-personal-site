'use client'

type DayData = {
  dateStr: string
  income: number
  isFuture: boolean
  isToday: boolean
}

type Props = {
  logs: { date: string; income: number | null }[]
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Color based on earnings that day
function cellColor(income: number, isFuture: boolean): string {
  if (isFuture) return 'rgba(0,0,0,0)' // invisible
  if (income === 0) return 'rgba(0,0,0,0.07)'
  if (income < 40) return '#fed7aa'  // orange-200
  if (income < 80) return '#fb923c'  // orange-400
  if (income < 120) return '#f97316' // orange-500
  return '#c2410c'                   // orange-700
}

const CELL = 20  // px
const GAP = 3    // px
const DAY_LABEL_WIDTH = 32

// Start from the Sunday on or before Jan 1, 2026
const START_SUNDAY = new Date(2025, 11, 28) // Dec 28, 2025

export default function ContributionGraph({ logs }: Props) {
  const incomeMap = new Map<string, number>()
  for (const log of logs) {
    if (log.date) {
      incomeMap.set(log.date, (incomeMap.get(log.date) || 0) + (log.income || 0))
    }
  }

  const now = new Date()
  const todayStr = formatDate(now)

  // How many weeks to show: from START_SUNDAY through the current week
  const currentSunday = new Date(now)
  currentSunday.setDate(now.getDate() - now.getDay())
  const msPerWeek = 7 * 24 * 3600 * 1000
  const numWeeks = Math.ceil((currentSunday.getTime() - START_SUNDAY.getTime()) / msPerWeek) + 1

  // Build week columns
  const weeks: DayData[][] = []
  for (let w = 0; w < numWeeks; w++) {
    const week: DayData[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(START_SUNDAY)
      date.setDate(START_SUNDAY.getDate() + w * 7 + d)
      const dateStr = formatDate(date)
      const isFuture = date > now
      week.push({
        dateStr,
        income: incomeMap.get(dateStr) || 0,
        isFuture,
        isToday: dateStr === todayStr,
      })
    }
    weeks.push(week)
  }

  // Month label: show label in the first column of each new month
  function getMonthLabel(wi: number): string {
    const colDate = new Date(START_SUNDAY)
    colDate.setDate(START_SUNDAY.getDate() + wi * 7)
    if (wi === 0) return colDate.toLocaleDateString('en-US', { month: 'long' })
    const prevDate = new Date(START_SUNDAY)
    prevDate.setDate(START_SUNDAY.getDate() + (wi - 1) * 7)
    if (colDate.getMonth() !== prevDate.getMonth()) {
      return colDate.toLocaleDateString('en-US', { month: 'long' })
    }
    return ''
  }

  // Summary stats
  const startStr = formatDate(START_SUNDAY)
  let windowEarned = 0
  let windowDays = 0
  for (const [date, income] of incomeMap.entries()) {
    if (date >= startStr && date <= todayStr) {
      windowEarned += income
      windowDays++
    }
  }

  const colWidth = CELL + GAP

  return (
    <div className="doordash-card space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-sm font-bold text-black uppercase tracking-wider">
            2026 Driving Activity
          </h3>
          <p className="font-sans text-xs font-bold text-black/60 mt-1">
            Each square is one day. The more orange it is, the more I earned that day.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs font-bold text-black/50 font-sans">
          <span>Less</span>
          {[
            'rgba(0,0,0,0.07)',
            '#fed7aa',
            '#fb923c',
            '#f97316',
            '#c2410c',
          ].map((color, i) => (
            <div
              key={i}
              style={{ width: CELL, height: CELL, background: color, borderRadius: 4 }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto">
        <div style={{ display: 'inline-block' }}>

          {/* Month labels */}
          <div style={{ display: 'flex', paddingLeft: DAY_LABEL_WIDTH + GAP, marginBottom: 6 }}>
            {weeks.map((_, wi) => {
              const label = getMonthLabel(wi)
              return (
                <div
                  key={wi}
                  style={{ width: CELL, marginRight: GAP, flexShrink: 0 }}
                  className="font-sans text-xs font-bold text-black/70 overflow-visible whitespace-nowrap"
                >
                  {label}
                </div>
              )
            })}
          </div>

          {/* Day labels + week columns */}
          <div style={{ display: 'flex' }}>

            {/* Day of week labels (Mon, Wed, Fri only to avoid crowding) */}
            <div style={{ width: DAY_LABEL_WIDTH, marginRight: GAP, flexShrink: 0 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                <div
                  key={i}
                  style={{ height: CELL, marginBottom: i < 6 ? GAP : 0, display: 'flex', alignItems: 'center' }}
                  className={`font-sans text-xs font-bold ${i % 2 === 1 ? 'text-black/60' : 'text-transparent'}`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: 'flex', gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={
                        !day.isFuture
                          ? day.income > 0
                            ? `${day.dateStr}: $${day.income.toFixed(2)} earned`
                            : `${day.dateStr}: no shift`
                          : ''
                      }
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 4,
                        background: cellColor(day.income, day.isFuture),
                        outline: day.isToday ? '2px solid rgba(0,0,0,0.4)' : 'none',
                        outlineOffset: 1,
                        cursor: day.isFuture ? 'default' : 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                      className={day.isFuture ? '' : 'hover:opacity-70'}
                    />
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-200">
        <div>
          <p className="font-mono text-lg font-bold text-black">{windowDays}</p>
          <p className="font-sans text-xs font-bold text-black/50 uppercase tracking-wide">Days Worked in 2026</p>
        </div>
        <div>
          <p className="font-mono text-lg font-bold text-black">${windowEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="font-sans text-xs font-bold text-black/50 uppercase tracking-wide">Earned in 2026</p>
        </div>
      </div>

    </div>
  )
}
