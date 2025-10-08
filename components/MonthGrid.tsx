"use client"

import { useEffect, useMemo, useState } from "react"

import { todayInTZ } from "@/lib/when"

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
  // Вычисляем «сегодня» при каждом рендере (по локальной таймзоне пользователя)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const t = todayInTZ(tz)
  const todayYear = t.y
  const todayMonth = t.m - 1 // 0-based month для сравнения с пропсом month
  const todayDay = t.d

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
