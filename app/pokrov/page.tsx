"use client"

import { useEffect, useState } from "react"
import { CalendarDays, UserPlus } from "lucide-react"
import AccountModal from "@/components/AccountModal"
import MonthGrid from "@/components/MonthGrid"
import PokrovBirthdayModal from "@/components/PokrovBirthdayModal"
import ReminderSettingsPanel from "@/components/ReminderSettingsPanel"
import ThemeSettingsPanel from "@/components/ThemeSettingsPanel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MONTHS } from "@/constants/months"
import type { CalendarTheme } from "@/lib/calendar-theme"
import { useCalendarThemeSettings } from "@/hooks/useCalendarThemeSettings"

type SessionUser = {
  id: number
  email: string
  hasPassword?: boolean
  calendarTheme?: CalendarTheme
}

type SharedCalendar = {
  id: number
  name: string
  slug: string
  ownerUserId: number | null
}

type SharedMember = {
  id: number
  calendarId: number
  userId: number
  timezone: string
  notificationsEnabled: boolean
  reminderDays: number[]
  reminderHour: number
}

type SharedBirthdaySummary = {
  id: number
  calendarId: number
  userId: number | null
  name: string
  date: string | null
  birthMonth: number | null
  birthDay: number | null
  birthYear: number | null
}

type PokrovData = {
  calendar: SharedCalendar
  member: SharedMember
  myBirthday: SharedBirthdaySummary | null
  birthdays: SharedBirthdaySummary[]
  user: SessionUser
  isAdmin: boolean
}

const REMINDER_DAY_OPTIONS = [
  { value: 0, label: "В день" },
  { value: 1, label: "За день" },
  { value: 7, label: "За неделю" },
] as const

function getBirthdayMonth(birthday: SharedBirthdaySummary) {
  if (birthday.birthMonth) return birthday.birthMonth - 1
  if (!birthday.date) return null

  const [, month] = birthday.date.split("-").map(Number)
  return month - 1
}

export default function PokrovPage() {
  const currentYear = new Date().getFullYear()
  const [data, setData] = useState<PokrovData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<{ month: number; day: number } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [timezone, setTimezone] = useState("Europe/Moscow")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [reminderDays, setReminderDays] = useState<number[]>([0, 1, 7])
  const [reminderHour, setReminderHour] = useState(6)
  const {
    calendarTheme,
    themeSaving,
    themeStatus,
    handleCalendarThemeChange,
    syncCalendarTheme,
  } = useCalendarThemeSettings(Boolean(data))

  function applyData(nextData: PokrovData) {
    setData(nextData)
    syncCalendarTheme(nextData.user.calendarTheme)
    setTimezone(nextData.member.timezone)
    setNotificationsEnabled(nextData.member.notificationsEnabled)
    setReminderDays(nextData.member.reminderDays.length ? nextData.member.reminderDays : [])
    setReminderHour(nextData.member.reminderHour)
  }

  async function loadPokrov(showLoader = true) {
    if (showLoader) setLoading(true)
    try {
      const res = await fetch("/api/shared/pokrov", { cache: "no-store" })
      if (res.status === 401) {
        setData(null)
        return
      }

      if (!res.ok) throw new Error("load_failed")

      const nextData = await res.json()
      applyData(nextData)
    } catch {
      setMessage({ type: "error", text: "Не удалось загрузить общий календарь." })
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadPokrov()
  }, [])

  function handleDayClick(month: number, day: number) {
    if (loading && !data) return

    if (!data) {
      setShowAccountModal(true)
      return
    }

    setSelectedDay({ month, day })
    setShowBirthdayModal(true)
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    setMessage(null)
    try {
      const res = await fetch("/api/shared/pokrov/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          notificationsEnabled,
          reminderDays,
          reminderHour,
        }),
      })

      if (!res.ok) throw new Error("settings_failed")

      const saved = await res.json()
      setData((current) => current ? { ...current, member: saved.member } : current)
      setMessage({ type: "success", text: "Настройки напоминаний сохранены." })
    } catch {
      setMessage({ type: "error", text: "Не удалось сохранить настройки." })
    } finally {
      setSavingSettings(false)
    }
  }

  function handleAccountClose() {
    setShowAccountModal(false)
    loadPokrov()
  }

  const birthdays = data?.birthdays ?? []
  const showAccessPrompt = !loading && !data
  const settingsDisabled = savingSettings || !data

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-15 shrink-0">
                <img
                  src="/POKROV.png"
                  alt=""
                  className="size-full scale-[1.2] object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Народный хор Покров</h1>
                <div className="text-sm text-muted-foreground">Общий календарь дней рождения коллектива</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <ThemeSettingsPanel
                  theme={calendarTheme}
                  saving={themeSaving}
                  status={themeStatus}
                  onChange={handleCalendarThemeChange}
                />
              )}
              <Button variant="outline" onClick={() => setShowAccountModal(true)}>
                <UserPlus className="size-4" />
                {data ? data.user.email : "Войти или зарегистрироваться"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-3 py-4">
        {showAccessPrompt ? (
          <div className="rounded-md border p-4">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="size-5" />
              Доступ к календарю «Народный хор Покров»
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Войди или зарегистрируйся по этой ссылке, чтобы добавить свою единственную запись о дне рождения и получать напоминания обо всех участниках.
            </p>
            <Button onClick={() => setShowAccountModal(true)}>
              Войти или зарегистрироваться
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MONTHS.map((monthName, monthIndex) => {
                  const byMonth = birthdays.filter((birthday) => getBirthdayMonth(birthday) === monthIndex)

                  return (
                    <Card key={monthIndex} className="border-border bg-transparent p-4 shadow-none">
                      <div className="space-y-3">
                        <h2 className="text-center text-lg font-semibold text-foreground">{monthName}</h2>
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

            <aside className="space-y-4">
              <ReminderSettingsPanel
                timezone={timezone}
                reminderHour={reminderHour}
                notificationsEnabled={notificationsEnabled}
                reminderDays={reminderDays}
                disabled={settingsDisabled}
                saving={savingSettings}
                status={message}
                dayOptions={[...REMINDER_DAY_OPTIONS]}
                onTimezoneChange={setTimezone}
                onReminderHourChange={setReminderHour}
                onNotificationsEnabledChange={setNotificationsEnabled}
                onReminderDaysChange={setReminderDays}
                onSave={handleSaveSettings}
              />
            </aside>
          </div>
        )}
      </main>

      <PokrovBirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        selectedDay={selectedDay}
        year={currentYear}
        currentUserId={data?.user.id ?? null}
        isAdmin={data?.isAdmin ?? false}
        onChanged={() => loadPokrov(false)}
      />

      <AccountModal
        open={showAccountModal}
        onClose={handleAccountClose}
        initialUser={data?.user ?? null}
        authLoading={loading}
        passwordOnly
      />
    </div>
  )
}
