"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User } from "lucide-react"
import MonthGrid from "@/components/MonthGrid"

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]

const SAMPLE_BIRTHDAYS = [
  { name: "Анна", date: "2024-01-15" },
  { name: "Петр", date: "2024-03-22" },
  { name: "Мария", date: "2024-05-08" },
  { name: "Иван", date: "2024-07-12" },
  { name: "Елена", date: "2024-09-03" },
  { name: "Алексей", date: "2024-11-28" },
]

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
        <div className="container mx-auto px-4 py-4">
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <Dialog open={showBirthdayModal} onOpenChange={setShowBirthdayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Добавить день рождения
              {selectedDay && ` - ${selectedDay.day} ${MONTHS[selectedDay.month]}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" placeholder="Введите имя" />
            </div>
            <div>
              <Label htmlFor="date">Дата</Label>
              <Input id="date" type="date" />
            </div>
            <div>
              <Label htmlFor="note">Заметка (необязательно)</Label>
              <Input id="note" placeholder="Подарок, возраст и т.д." />
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1">Сохранить</Button>
              <Button variant="outline" onClick={() => setShowBirthdayModal(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки аккаунта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input id="username" placeholder="Ваше имя" defaultValue="Пользователь" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="notifications">Уведомления</Label>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="email-notifications" defaultChecked />
                <label htmlFor="email-notifications" className="text-sm">
                  Email уведомления
                </label>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="push-notifications" />
                <label htmlFor="push-notifications" className="text-sm">
                  Push уведомления
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1">Сохранить</Button>
              <Button variant="outline" onClick={() => setShowAccountModal(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
