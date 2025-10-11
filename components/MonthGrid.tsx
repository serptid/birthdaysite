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

type Today = { y: number; m: number; d: number }

function getTodayInTZ(tz: string): Today {
  // Формируем дату через локализованную строку, чтобы учесть TZ без двусмысленностей
  const s = new Date().toLocaleString("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  })
  // en-CA даёт "YYYY-MM-DD, HH:MM:SS" или "YYYY-MM-DD"
  const [ymd] = s.split(",")
  const [y, m, d] = ymd.split("-").map(Number)
  return { y, m, d }
}

function msUntilNextMidnight(tz: string): number {
  const now = new Date()
  const today = getTodayInTZ(tz)
  // Берём следующую «полночь» в TZ, вычисляя через локализованный конструктор
  const nextLocalDate = new Date(
    `${today.y}-${String(today.m).padStart(2, "0")}-${String(today.d).padStart(2, "0")}T00:00:00`
  ).getTime()
  // Смещаем к следующему дню
  // Добавляем сутки в миллисекундах
  const oneDay = 24 * 60 * 60 * 1000
  // Теперь переводим эту локальную «полночь» к реальному времени TZ через toLocale… трюк:
  const next = new Date(nextLocalDate + oneDay)
  // Безопасный вариант: ждать хотя бы 61 секунду после полуночи на случай DST
  const diff = next.getTime() - now.getTime()
  return Math.max(diff + 61 * 1000, 60 * 1000)
}

export default function MonthGrid({ year, month, birthdays, onDayClick }: MonthGridProps) {
  // Таймзона только на клиенте
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", [])
  const [today, setToday] = useState<Today>(() => getTodayInTZ(tz))

  // Обновление в полночь по TZ + страховки
  useEffect(() => {
    setToday(getTodayInTZ(tz)) // первичная синхронизация

    const toMidnight = setTimeout(() => {
      setToday(getTodayInTZ(tz))
      // после срабатывания ставим следующий таймер
    }, msUntilNextMidnight(tz))

    // Страховка: раз в 5 минут сверяемся (на случай сна вкладки/перехода лето/зима)
    const heartbeat = setInterval(() => {
      const t = getTodayInTZ(tz)
      setToday(prev => (prev.y !== t.y || prev.m !== t.m || prev.d !== t.d ? t : prev))
    }, 5 * 60 * 1000)

    // Обновление при возврате во вкладку
    const onVisibility = () => {
      if (!document.hidden) setToday(getTodayInTZ(tz))
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      clearTimeout(toMidnight)
      clearInterval(heartbeat)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [tz])

  const todayYear = today.y
  const todayMonth = today.m - 1
  const todayDay = today.d

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function hasBirthdays(_y: number, m_: number, d_: number) {
    return birthdays.some(b => {
      const [, m, d] = b.date.split("-").map(Number)
      return m - 1 === m_ && d === d_
    })
  }

  return (
    <div className="grid grid-cols-11 gap-1 w-full">
      {days.map(day => {
        const hasBirthday = hasBirthdays(year, month, day)
        const isToday = year === todayYear && month === todayMonth && day === todayDay

        const base =
          "relative w-6 h-6 rounded-sm border flex items-center justify-center text-xs font-extrabold transition-all duration-200 hover:scale-110 cursor-pointer group"
        const normal = "bg-muted text-muted-foreground border-border hover:bg-muted/80"
        const withBirthday = "bg-green-500 text-[var(--color-background)] border-green-700 shadow-sm"
        const todayCls = isToday
          ? "ring-2 ring-indigo-400 border-2 border-indigo-500 bg-indigo-100 text-indigo-800 shadow-md"
          : ""

        const names = hasBirthday
          ? birthdays
              .filter(b => {
                const [, m, d] = b.date.split("-").map(Number)
                return m - 1 === month && d === day
              })
              .map(b => b.name)
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
