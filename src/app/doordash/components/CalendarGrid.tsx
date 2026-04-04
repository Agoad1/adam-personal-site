'use client'

type Props = {
  workedDates: string[] // array of "YYYY-MM-DD" strings
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

function buildMonths(count = 3) {
  const months = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return months
}

export default function CalendarGrid({ workedDates }: Props) {
  const workedSet = new Set(workedDates)
  const months = buildMonths(3)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="card space-y-4">
      <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">Days Worked</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {months.map(({ year, month }) => {
          const days = getDaysInMonth(year, month)
          const firstDay = getFirstDayOfMonth(year, month)
          const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          const cells = Array.from({ length: firstDay }, (_, i) => i) // empty cells

          return (
            <div key={`${year}-${month}`} className="space-y-1.5">
              <p className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wide text-center">{label}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-slate-400 font-semibold pb-1">{d}</div>
                ))}
                {cells.map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const worked = workedSet.has(dateStr)
                  const isToday = dateStr === today
                  return (
                    <div
                      key={day}
                      title={worked ? `Dashed on ${dateStr}` : dateStr}
                      className={`
                        aspect-square flex items-center justify-center rounded text-xs font-medium transition-colors
                        ${worked ? 'bg-blue-500 text-white' : 'text-slate-500'}
                        ${isToday && !worked ? 'ring-1 ring-blue-400 text-slate-700' : ''}
                      `}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
