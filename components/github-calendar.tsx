"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Birthday {
  id: string
  name: string
  date: string // YYYY-MM-DD format
  year?: number // Optional birth year
}

interface GitHubCalendarProps {
  currentDate: Date
}

export function GitHubCalendar({ currentDate }: GitHubCalendarProps) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  // Load birthdays from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("birthdays")
    if (stored) {
      setBirthdays(JSON.parse(stored))
    }
  }, [])

  const generateMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateString = date.toISOString().split("T")[0]

      const dayBirthdays = birthdays.filter((b) => {
        const bDate = new Date(b.date)
        return bDate.getMonth() === date.getMonth() && bDate.getDate() === date.getDate()
      })

      days.push({
        date: date,
        dateString,
        birthdays: dayBirthdays,
        day: day,
      })
    }

    return days
  }

  const days = generateMonthDays()

  const getBirthdayIntensity = (birthdayCount: number) => {
    if (birthdayCount === 0) return "bg-muted hover:bg-muted/80"
    if (birthdayCount === 1) return "bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800"
    if (birthdayCount === 2) return "bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600"
    return "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400"
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-2 max-w-2xl mx-auto">
        {days.map((day) => (
          <div
            key={day.day}
            className="relative"
            onMouseEnter={() => setHoveredDate(day.dateString)}
            onMouseLeave={() => setHoveredDate(null)}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-lg border border-border transition-all duration-200 hover:scale-105 cursor-pointer flex items-center justify-center text-sm font-medium",
                getBirthdayIntensity(day.birthdays.length),
                day.birthdays.length > 0 && "ring-2 ring-green-500/20",
              )}
            >
              {day.day}
            </div>

            {/* Tooltip */}
            {hoveredDate === day.dateString && (
              <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg border border-border whitespace-nowrap">
                <div className="font-medium">
                  {day.date.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                {day.birthdays.length > 0 ? (
                  day.birthdays.map((birthday) => (
                    <div key={birthday.id} className="text-xs">
                      🎂 {birthday.name}
                      {birthday.year && ` (${new Date().getFullYear() - birthday.year} лет)`}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">Нет дней рождения</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>Меньше</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded border border-border bg-muted" />
          <div className="w-4 h-4 rounded border border-border bg-green-200 dark:bg-green-900" />
          <div className="w-4 h-4 rounded border border-border bg-green-400 dark:bg-green-700" />
          <div className="w-4 h-4 rounded border border-border bg-green-600 dark:bg-green-500" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  )
}
