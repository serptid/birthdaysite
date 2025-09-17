"use client"

interface Birthday { name: string; date: string } // "YYYY-MM-DD"

interface MonthGridProps {
  year: number
  month: number // 0-11
  birthdays: Birthday[]
  onDayClick?: (day: number) => void
}

export default function MonthGrid({ year, month, birthdays, onDayClick }: MonthGridProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function hasBirthdays(y_: number, m_: number, d_: number) {
    return birthdays.some((b) => {
      const [y, m, d] = b.date.split("-").map(Number)
      return y === y_ && m - 1 === m_ && d === d_
    })
  }

  // Сегодня по МСК
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const todayYear = Number(parts.find(p => p.type === "year")?.value)
  const todayMonth = Number(parts.find(p => p.type === "month")?.value) - 1
  const todayDay = Number(parts.find(p => p.type === "day")?.value)

  return (
    <div className="grid grid-cols-11 gap-1 max-w-2xl mx-auto">
      {days.map((day) => {
        const hasBirthday = hasBirthdays(year, month, day)
        const isToday = year === todayYear && month === todayMonth && day === todayDay

        const base =
          "relative w-6 h-6 rounded-sm border flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-110 cursor-pointer group"
        const normal = "bg-muted text-muted-foreground border-border hover:bg-muted/80"
        const withBirthday = "bg-green-500 text-white border-green-700 shadow-sm"
        const todayCls = isToday ? "border-2 border-green-500" : ""

        const names =
          hasBirthday
            ? birthdays
                .filter((b) => {
                  const [y, m, d] = b.date.split("-").map(Number)
                  return y === year && m - 1 === month && d === day
                })
                .map((b) => b.name)
                .join(", ")
            : `${day} число`

        return (
          <div
            key={day}
            className={[base, hasBirthday ? withBirthday : normal, todayCls].join(" ")}
            title={names}
            onClick={() => onDayClick?.(day)}
          >
            {day}
            {hasBirthday && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {names}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
