"use client"

interface Birthday {
  name: string
  date: string
}

interface MonthGridProps {
  year: number
  month: number // 0-11
  birthdays: Birthday[]
  onDayClick?: (day: number) => void
}

export default function MonthGrid({ year, month, birthdays, onDayClick }: MonthGridProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const getBirthdaysForDay = (day: number) => {
    return birthdays.filter((birthday) => {
      const birthdayDate = new Date(birthday.date)
      return birthdayDate.getMonth() === month && birthdayDate.getDate() === day
    })
  }

  return (
    <div className="grid grid-cols-11 gap-1 max-w-2xl mx-auto">
      {days.map((day) => {
        const dayBirthdays = getBirthdaysForDay(day)
        const hasBirthday = dayBirthdays.length > 0

        return (
          <div
            key={day}
            className={`
              relative w-6 h-6 rounded-sm border flex items-center justify-center text-xs font-medium
              transition-all duration-200 hover:scale-110 cursor-pointer group
              ${
                hasBirthday
                  ? "bg-green-500 text-white border-green-600 shadow-sm"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }
            `}
            title={hasBirthday ? dayBirthdays.map((b) => b.name).join(", ") : `${day} число`}
            onClick={() => onDayClick?.(day)}
          >
            {day}

            {hasBirthday && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {dayBirthdays.map((birthday) => birthday.name).join(", ")}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
