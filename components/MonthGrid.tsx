"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"
import { DEFAULT_CALENDAR_THEME, type CalendarTheme } from "@/lib/calendar-theme"

interface Birthday {
  name: string
  date: string | null // "YYYY-MM-DD"
  birthMonth?: number | null
  birthDay?: number | null
  birthYear?: number | null
}

interface MonthGridProps {
  year: number
  month: number // 0-11
  birthdays: Birthday[]
  theme?: CalendarTheme
  onDayClick?: (day: number) => void
}

type Today = { y: number; m: number; d: number }

function getTodayInTZ(tz: string): Today {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    y: Number(values.year),
    m: Number(values.month),
    d: Number(values.day),
  }
}

export default function MonthGrid({ year, month, birthdays, theme = DEFAULT_CALENDAR_THEME, onDayClick }: MonthGridProps) {
  // Таймзона только на клиенте
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", [])
  const [today, setToday] = useState<Today>(() => getTodayInTZ(tz))

  // Сверяем текущий день регулярно: это переживает сон вкладки и смену даты без перезагрузки.
  useEffect(() => {
    const syncToday = () => {
      const t = getTodayInTZ(tz)
      setToday(prev => (prev.y !== t.y || prev.m !== t.m || prev.d !== t.d ? t : prev))
    }

    syncToday()
    const heartbeat = setInterval(syncToday, 60 * 1000)

    const onVisibility = () => {
      if (!document.hidden) syncToday()
    }
    const onFocus = () => syncToday()

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", onFocus)
    }
  }, [tz])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function birthdayMonthDay(birthday: Birthday) {
    if (birthday.birthMonth && birthday.birthDay) {
      return { month: birthday.birthMonth - 1, day: birthday.birthDay }
    }

    if (!birthday.date) return null
    const [, m, d] = birthday.date.split("-").map(Number)
    return { month: m - 1, day: d }
  }

  function hasBirthdays(_y: number, m_: number, d_: number) {
    return birthdays.some(b => {
      const birthday = birthdayMonthDay(b)
      return Boolean(birthday && birthday.month === m_ && birthday.day === d_)
    })
  }

  function birthdayLabel(birthday: Birthday) {
    if (!birthday.birthYear) return birthday.name

    const age = year - birthday.birthYear
    return age >= 0 ? `${birthday.name} - ${age} г.` : birthday.name
  }

  return (
    <div className="isolate grid grid-cols-11 gap-1 w-full">
      {days.map(day => {
        const hasBirthday = hasBirthdays(year, month, day)
        const isToday = year === today.y && month === today.m - 1 && day === today.d

        const base =
          "relative w-6 h-6 rounded-sm border border-transparent flex items-center justify-center text-xs font-extrabold transition-all duration-200 hover:scale-110 cursor-pointer group hover:z-40 focus-visible:z-40"
        const normal = "bg-muted text-muted-foreground hover:bg-muted/80"
        const withBirthday = "bg-green-500 text-[var(--color-background)] shadow-sm"
        const todayCls = isToday
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-[1]"
          : ""
        const dayStyle = {
          color: hasBirthday ? theme.birthdayText : theme.dayText,
          backgroundColor: hasBirthday ? theme.birthdayBackground : undefined,
          "--tw-ring-color": theme.todayBorder,
        } as CSSProperties

        const birthdayLabels = birthdays
          .filter(b => {
            const birthday = birthdayMonthDay(b)
            return Boolean(birthday && birthday.month === month && birthday.day === day)
          })
          .map(birthdayLabel)

        const names = hasBirthday ? birthdayLabels.join(", ") : `${day} число`
        const title = isToday ? `Сегодня - ${names}` : names

        return (
          <div
            key={day}
            className={[base, hasBirthday ? withBirthday : normal, todayCls].join(" ")}
            style={dayStyle}
            title={title}
            onClick={() => onDayClick?.(day)}
          >
            {day}

            {hasBirthday && (
              <div
                className="
                  pointer-events-none invisible group-hover:visible
                  absolute bottom-full left-1/2 -translate-x-1/2
                  mb-2 rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white shadow-lg
                  transition-opacity duration-200 whitespace-nowrap z-50
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
