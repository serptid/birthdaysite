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

  // Обновляем метку «сегодня» по локальной полуночи пользователя
  useEffect(() => {
    // Переключаем «сегодня» по локальному времени пользователя
    let dailyId: ReturnType<typeof setInterval> | null = null

    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    )
    let msUntilMidnight = nextMidnight.getTime() - now.getTime()
    if (msUntilMidnight <= 0) msUntilMidnight = 1000

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

  // Вычисляем «сегодня» по локальному времени пользователя
  const { todayYear, todayMonth, todayDay } = useMemo(() => {
    const now = new Date(tick)
    return {
      todayYear: now.getFullYear(),
      todayMonth: now.getMonth(),
      todayDay: now.getDate(),
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
