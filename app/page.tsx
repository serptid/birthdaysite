"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MonthGrid from "@/components/MonthGrid"
import BirthdayModal from "@/components/BirthdayModal"
import AccountModal from "@/components/AccountModal"
import ReminderSettingsPanel from "@/components/ReminderSettingsPanel"
import ThemeSettingsPanel from "@/components/ThemeSettingsPanel"
import CountUp from "@/components/CountUp"
import { MONTHS } from "@/constants/months"
import type { CalendarTheme } from "@/lib/calendar-theme"
import { useCalendarThemeSettings } from "@/hooks/useCalendarThemeSettings"
import { User } from "lucide-react"

interface SessionUser {
  id: number
  email: string
  hasPassword?: boolean
  timezone?: string
  notificationsEnabled?: boolean
  reminderDays?: number[]
  reminderHour?: number
  calendarTheme?: CalendarTheme
}
interface Birthday {
  id: number
  userId: number
  name: string
  date: string | null
  birthMonth?: number | null
  birthDay?: number | null
  birthYear?: number | null
  note?: string | null
}

const REMINDER_DAY_OPTIONS = [
  { value: 0, label: "В день" },
  { value: 1, label: "За день" },
  { value: 7, label: "За неделю" },
] as const

export default function HomePage() {
  const currentYear = new Date().getFullYear()
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<{ month: number; day: number } | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [timezone, setTimezone] = useState("Europe/Moscow")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [reminderDays, setReminderDays] = useState<number[]>([0, 1, 7])
  const [reminderHour, setReminderHour] = useState(6)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const {
    calendarTheme,
    themeSaving,
    themeStatus,
    handleCalendarThemeChange,
    syncCalendarTheme,
  } = useCalendarThemeSettings(Boolean(user))

  function applyAccount(nextUser: SessionUser | null, syncTheme = true) {
    setUser(nextUser)

    if (!nextUser) {
      if (syncTheme) syncCalendarTheme(null)
      setBirthdays([])
      return
    }

    if (syncTheme) syncCalendarTheme(nextUser.calendarTheme)
    setTimezone(nextUser.timezone ?? "Europe/Moscow")
    setNotificationsEnabled(nextUser.notificationsEnabled ?? true)
    setReminderDays(
      nextUser.reminderDays?.filter((day) => REMINDER_DAY_OPTIONS.some((option) => option.value === day)) ?? [0, 1, 7]
    )
    setReminderHour(nextUser.reminderHour ?? 6)
  }

  const handleDayClick = (month: number, day: number) => {
    if (!user) {
      setShowAccountModal(true)
      return
    }
    setSelectedDay({ month, day })
    setShowBirthdayModal(true)
  }

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      setAuthLoading(true)
      try {
        const r = await fetch("/api/account", { cache: "no-store" })
        if (r.status === 401) {
          if (!cancelled) applyAccount(null)
          return
        }

        const d = await r.json()
        if (!cancelled) {
          const nextUser = d.user ?? null
          applyAccount(nextUser)
        }
      } catch {
        if (!cancelled) applyAccount(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    loadUser()

    return () => {
      cancelled = true
    }
  }, [showAccountModal])

  async function handleSaveSettings() {
    if (!user) {
      setShowAccountModal(true)
      return
    }

    setSavingSettings(true)
    setSettingsStatus(null)
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          notificationsEnabled,
          reminderDays,
          reminderHour,
        }),
      })

      if (!res.ok) throw new Error("settings_save_failed")

      const data = await res.json()
      if (data.user) applyAccount(data.user, false)
      setSettingsStatus({ type: "success", text: "Настройки напоминаний сохранены." })
    } catch {
      setSettingsStatus({ type: "error", text: "Не удалось сохранить настройки." })
    } finally {
      setSavingSettings(false)
    }
  }

  async function loadBirthdays() {
    try {
      const r = await fetch("/api/people", { cache: "no-store" })
      const d = await r.json()
      setBirthdays(Array.isArray(d) ? d : [])
    } catch { setBirthdays([]) }
  }

  useEffect(() => {
    if (user) {
      loadBirthdays()
    } else {
      setBirthdays([])
    }
  }, [user, showBirthdayModal])

  function getBirthdayMonth(birthday: Birthday) {
    if (birthday.birthMonth) return birthday.birthMonth - 1
    if (!birthday.date) return null

    const [, month] = birthday.date.split("-").map(Number)
    return month - 1
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="lg:px-45 container mx-auto px-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              Birthday Calendar{" "}
              <CountUp
                to={currentYear}
                duration={6}
                className="inline-block min-w-[4ch] text-right tabular-nums"
              />
            </h1>
            <div className="flex items-center gap-2">
              {user && (
                <ThemeSettingsPanel
                  theme={calendarTheme}
                  saving={themeSaving}
                  status={themeStatus}
                  onChange={handleCalendarThemeChange}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {authLoading && !user ? "Проверяем..." : user ? user.email : "Войти"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto lg:px-45 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MONTHS.map((monthName, monthIndex) => {
                const byMonth = birthdays.filter((b) => {
                  return getBirthdayMonth(b) === monthIndex
                })
                return (
                  <Card key={monthIndex} className="border-border bg-transparent p-4 shadow-none">
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-foreground text-center">{monthName}</h2>
                      <MonthGrid
                        year={currentYear}
                        month={monthIndex}
                        birthdays={byMonth}
                        theme={calendarTheme}
                        onDayClick={(day) => handleDayClick(monthIndex, day)}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          <aside>
            <ReminderSettingsPanel
              timezone={timezone}
              notificationsEnabled={notificationsEnabled}
              reminderDays={reminderDays}
              disabled={savingSettings || !user}
              saving={savingSettings}
              status={settingsStatus}
              dayOptions={[...REMINDER_DAY_OPTIONS]}
              onTimezoneChange={setTimezone}
              onNotificationsEnabledChange={setNotificationsEnabled}
              onReminderDaysChange={setReminderDays}
              onSave={handleSaveSettings}
            />
          </aside>
        </div>
      </main>

      <BirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        selectedDay={selectedDay}
        year={currentYear}
        onChanged={loadBirthdays}
      />
      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        initialUser={user}
        authLoading={authLoading}
        passwordOnly
      />
    </div>
  )
}
