"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MonthGrid from "@/components/MonthGrid"
import BirthdayModal from "@/components/BirthdayModal"
import AccountModal from "@/components/AccountModal"
import { MONTHS } from "@/constants/months"
import { User } from "lucide-react"

interface SessionUser { id: number; nickname: string; email: string }
interface Birthday { id: number; userId: number; name: string; date: string; note?: string | null }

export default function HomePage() {
  const currentYear = new Date().getFullYear()
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<{ month: number; day: number } | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [birthdays, setBirthdays] = useState<Birthday[]>([])

  const handleDayClick = (month: number, day: number) => {
    if (!user) {
      alert("Чтобы добавить дату, войдите или зарегистрируйтесь.")
      setShowAccountModal(true)
      return
    }
    setSelectedDay({ month, day })
    setShowBirthdayModal(true)
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" })
        const d = await r.json()
        setUser(d.user ?? null)
      } catch { setUser(null) }
    }
    loadUser()
  }, [showAccountModal])

  async function loadBirthdays() {
    try {
      const r = await fetch("/api/people", { cache: "no-store" })
      const d = await r.json()
      setBirthdays(Array.isArray(d) ? d : [])
    } catch { setBirthdays([]) }
  }

  useEffect(() => {
    if (user) loadBirthdays()
  }, [user, showBirthdayModal])

  function parseDate(iso: string) {
    const [y, m, d] = iso.split("-").map(Number)
    return { y, m0: m - 1, d }
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
              {user ? user.nickname : "Войти"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto lg:px-45 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MONTHS.map((monthName, monthIndex) => {
            const byMonth = birthdays.filter((b) => {
              const { y, m0 } = parseDate(b.date)
              return y === currentYear && m0 === monthIndex
            })
            return (
              <Card key={monthIndex} className="p-4">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground text-center">{monthName}</h2>
                  <MonthGrid
                    year={currentYear}
                    month={monthIndex}
                    birthdays={byMonth}
                    onDayClick={(day) => handleDayClick(monthIndex, day)}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      </main>

      <BirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        selectedDay={selectedDay}
        year={currentYear}
      />
      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  )
}
