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

function getLocalToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function CalendarGrid({ workedDates }: Props) {
  const workedSet = new Set(workedDates)
  const months = buildMonths(3)
  const today = getLocalToday()

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-sm font-bold text-slate-300 uppercase tracking-wider">Days Worked</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {months.map(({ year, month }) => {
          const days = getDaysInMonth(year, month)
          const firstDay = getFirstDayOfMonth(year, month)
          const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

          return (
            <div key={`${year}-${month}`} className="space-y-2">
              <p className="font-serif text-xs font-bold text-slate-400 uppercase tracking-wide text-center">{label}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-slate-500 font-semibold pb-1">{d}</div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const worked = workedSet.has(dateStr)
                  const isToday = dateStr === today
                  return (
                    <div
                      key={day}
                      title={worked ? `Logged: ${dateStr}` : dateStr}
                      className={`
                        aspect-square flex items-center justify-center rounded text-xs font-medium transition-colors
                        ${worked ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/40' : 'text-slate-500 hover:text-slate-300'}
                        ${isToday && !worked ? 'ring-1 ring-blue-400/60 text-slate-300' : ''}
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
