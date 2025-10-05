"use client"

import { useEffect, useMemo, useState } from "react"

interface Birthday {
  name: string
  date: string // "YYYY-MM-DD"
}

interface MonthGridProps {
  year: number
  month: number // 0-11
  birthdays: Birthday[]
  onDayClick?: (day: number) => void
}

export default function MonthGrid({ year, month, birthdays, onDayClick }: MonthGridProps) {
  const [tick, setTick] = useState(() => Date.now())

  // обновляем раз в минуту, чтобы метка «сегодня» менялась в реальном времени
  useEffect(() => {
    // Точно переключаем «сегодня» по полуночи МСК
    const parts = (date: Date) =>
      new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(date)

    const nowParts = parts(new Date())
    const h = Number(nowParts.find((p) => p.type === "hour")?.value)
    const m = Number(nowParts.find((p) => p.type === "minute")?.value)
    const s = Number(nowParts.find((p) => p.type === "second")?.value)

    // миллисекунды до следующей полуночи по МСК
    let msUntilMidnight = ((24 - h) * 3600 - m * 60 - s) * 1000
    if (msUntilMidnight <= 0) msUntilMidnight = 1000 // защита от граничных случаев

    let dailyId: ReturnType<typeof setInterval> | null = null

    const midnightId = setTimeout(() => {
      setTick(Date.now())
      // затем обновляем раз в сутки
      dailyId = setInterval(() => setTick(Date.now()), 24 * 60 * 60 * 1000)
    }, msUntilMidnight)

    return () => {
      clearTimeout(midnightId)
      if (dailyId) clearInterval(dailyId)
    }
  }, [])

  // вычисляем «сегодня по МСК» на каждом тике
  const { todayYear, todayMonth, todayDay } = useMemo(() => {
    const parts = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(tick))
    return {
      todayYear: Number(parts.find(p => p.type === "year")?.value),
      todayMonth: Number(parts.find(p => p.type === "month")?.value) - 1,
      todayDay: Number(parts.find(p => p.type === "day")?.value),
    }
  }, [tick])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function hasBirthdays(_y: number, m_: number, d_: number) {
    return birthdays.some((b) => {
      const [, m, d] = b.date.split("-").map(Number)
      return m - 1 === m_ && d === d_
    })
  }

  return (
    <div className="grid grid-cols-11 gap-1 w-full">
      {days.map((day) => {
        const hasBirthday = hasBirthdays(year, month, day)
        const isToday = year === todayYear && month === todayMonth && day === todayDay

        const base =
          "relative w-6 h-6 rounded-sm border flex items-center justify-center text-xs font-extrabold transition-all duration-200 hover:scale-110 cursor-pointer group"
        const normal = "bg-muted text-muted-foreground border-border hover:bg-muted/80"
        const withBirthday = "bg-green-500 text-[var(--color-background)] border-green-700 shadow-sm"
        const todayCls = isToday ? "ring-2 ring-indigo-400 border-2 border-indigo-500 bg-indigo-100 text-indigo-800 shadow-md animate-pulse" : ""

        const names = hasBirthday
          ? birthdays
              .filter((b) => {
                const [, m, d] = b.date.split("-").map(Number)
                return m - 1 === month && d === day
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
              <div
                className="
                  pointer-events-none invisible group-hover:visible
                  absolute bottom-full left-1/2 -translate-x-1/2
                  mb-2 px-2 py-1 bg-gray-900 text-white text-xs font-normal rounded shadow-lg
                  transition-opacity duration-200 whitespace-nowrap z-10
                "
              >
                {names}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
