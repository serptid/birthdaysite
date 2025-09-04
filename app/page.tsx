"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MonthGrid from "@/components/MonthGrid"
import BirthdayModal from "@/components/BirthdayModal"
import AccountModal from "@/components/AccountModal"
import { MONTHS } from "@/constants/months"
import { SAMPLE_BIRTHDAYS } from "@/constants/sampleBirthdays"
import { User } from "lucide-react"

export default function HomePage() {
  const currentYear = 2024
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<{ month: number; day: number } | null>(null)

  const handleDayClick = (month: number, day: number) => {
    setSelectedDay({ month, day })
    setShowBirthdayModal(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="lg:px-45 container mx-auto px-3 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Birthday Calendar {currentYear}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Аккаунт
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto lg:px-45 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MONTHS.map((monthName, monthIndex) => (
            <Card key={monthIndex} className="p-4">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground text-center">{monthName}</h2>
                <MonthGrid
                  year={currentYear}
                  month={monthIndex}
                  birthdays={SAMPLE_BIRTHDAYS}
                  onDayClick={(day) => handleDayClick(monthIndex, day)}
                />
              </div>
            </Card>
          ))}
        </div>
      </main>
      <BirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        selectedDay={selectedDay}
      />
      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  )
}