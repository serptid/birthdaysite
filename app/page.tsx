"use client"

import { useEffect, useRef, useState } from "react"
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
import { PanelRightOpen, User, UserCog } from "lucide-react"

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

type ReminderPanelPlacement = "page" | "profile"

const REMINDER_PANEL_PLACEMENT_KEY = "birthday-reminders-placement"
const REMINDER_PANEL_ANIMATION_MS = 420

type ReminderSettingsSnapshot = {
  timezone: string
  notificationsEnabled: boolean
  reminderDays: number[]
  reminderHour: number
}

function reminderSettingsKey(settings: ReminderSettingsSnapshot) {
  return JSON.stringify({
    timezone: settings.timezone,
    notificationsEnabled: settings.notificationsEnabled,
    reminderDays: [...settings.reminderDays].sort((a, b) => a - b),
    reminderHour: settings.reminderHour,
  })
}

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
  const [reminderPanelPlacement, setReminderPanelPlacement] = useState<ReminderPanelPlacement>("page")
  const [reminderPlacementReady, setReminderPlacementReady] = useState(false)
  const [animateReminderPanel, setAnimateReminderPanel] = useState(false)
  const [reminderPanelExiting, setReminderPanelExiting] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [testingReminderEmail, setTestingReminderEmail] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const lastSavedSettingsKey = useRef<string | null>(null)
  const settingsSaveSeq = useRef(0)
  const reminderPanelExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reminderPanelEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    calendarTheme,
    themeReady,
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
      lastSavedSettingsKey.current = null
      setSavingSettings(false)
      return
    }

    if (syncTheme) syncCalendarTheme(nextUser.calendarTheme)
    const nextTimezone = nextUser.timezone ?? "Europe/Moscow"
    const nextNotificationsEnabled = nextUser.notificationsEnabled ?? true
    const nextReminderDays =
      nextUser.reminderDays?.filter((day) => REMINDER_DAY_OPTIONS.some((option) => option.value === day)) ?? [0, 1, 7]
    const nextReminderHour = nextUser.reminderHour ?? 6

    setTimezone(nextTimezone)
    setNotificationsEnabled(nextNotificationsEnabled)
    setReminderDays(nextReminderDays)
    setReminderHour(nextReminderHour)
    lastSavedSettingsKey.current = reminderSettingsKey({
      timezone: nextTimezone,
      notificationsEnabled: nextNotificationsEnabled,
      reminderDays: nextReminderDays,
      reminderHour: nextReminderHour,
    })
  }

  const handleDayClick = (month: number, day: number) => {
    if (!user) {
      setShowAccountModal(true)
      return
    }
    setSelectedDay({ month, day })
    setShowBirthdayModal(true)
  }

  function changeReminderPanelPlacement(nextPlacement: ReminderPanelPlacement) {
    window.localStorage.setItem(REMINDER_PANEL_PLACEMENT_KEY, nextPlacement)

    if (reminderPanelExitTimer.current) {
      clearTimeout(reminderPanelExitTimer.current)
      reminderPanelExitTimer.current = null
    }
    if (reminderPanelEnterTimer.current) {
      clearTimeout(reminderPanelEnterTimer.current)
      reminderPanelEnterTimer.current = null
    }

    if (nextPlacement === "profile" && reminderPlacementReady && reminderPanelPlacement === "page") {
      setAnimateReminderPanel(false)
      setReminderPanelExiting(true)
      reminderPanelExitTimer.current = setTimeout(() => {
        setReminderPanelPlacement("profile")
        setReminderPanelExiting(false)
        reminderPanelExitTimer.current = null
      }, REMINDER_PANEL_ANIMATION_MS)
      return
    }

    setReminderPanelExiting(false)
    const shouldAnimateEnter = reminderPlacementReady && nextPlacement === "page" && reminderPanelPlacement !== "page"
    setAnimateReminderPanel(shouldAnimateEnter)
    setReminderPanelPlacement(nextPlacement)

    if (shouldAnimateEnter) {
      reminderPanelEnterTimer.current = setTimeout(() => {
        setAnimateReminderPanel(false)
        reminderPanelEnterTimer.current = null
      }, REMINDER_PANEL_ANIMATION_MS)
    }
  }

  useEffect(() => {
    const savedPlacement = window.localStorage.getItem(REMINDER_PANEL_PLACEMENT_KEY)
    if (savedPlacement === "page" || savedPlacement === "profile") {
      setReminderPanelPlacement(savedPlacement)
    }
    setReminderPlacementReady(true)
  }, [])

  useEffect(() => {
    return () => {
      if (reminderPanelExitTimer.current) {
        clearTimeout(reminderPanelExitTimer.current)
      }
      if (reminderPanelEnterTimer.current) {
        clearTimeout(reminderPanelEnterTimer.current)
      }
    }
  }, [])

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

  useEffect(() => {
    if (!user || authLoading) return

    const settings = { timezone, notificationsEnabled, reminderDays, reminderHour }
    const key = reminderSettingsKey(settings)
    if (key === lastSavedSettingsKey.current) {
      settingsSaveSeq.current++
      setSavingSettings(false)
      return
    }

    const saveSeq = ++settingsSaveSeq.current
    setSavingSettings(true)
    setSettingsStatus(null)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        })

        if (!res.ok) throw new Error("settings_save_failed")

        const data = await res.json()
        if (saveSeq !== settingsSaveSeq.current) return

        if (data.user) {
          applyAccount(data.user, false)
        } else {
          lastSavedSettingsKey.current = key
        }
        setSettingsStatus({ type: "success", text: "Сохранено." })
      } catch {
        if (saveSeq === settingsSaveSeq.current) {
          setSettingsStatus({ type: "error", text: "Не удалось сохранить настройки." })
        }
      } finally {
        if (saveSeq === settingsSaveSeq.current) setSavingSettings(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [user, authLoading, timezone, notificationsEnabled, reminderDays, reminderHour])

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

  async function sendTestReminderEmail() {
    if (!user) {
      setShowAccountModal(true)
      return
    }

    setTestingReminderEmail(true)
    setSettingsStatus(null)

    try {
      const res = await fetch("/api/account/reminder-test", { method: "POST" })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error === "rate_limited" ? "rate_limited" : "send_failed")
      }

      setSettingsStatus({
        type: "success",
        text: data?.matched
          ? "Письмо с реальными напоминаниями отправлено."
          : "Тестовое письмо отправлено: ДР на выбранные даты не найдены.",
      })
    } catch (error) {
      setSettingsStatus({
        type: "error",
        text:
          error instanceof Error && error.message === "rate_limited"
            ? "Слишком много проверок. Попробуй позже."
            : "Не удалось отправить тестовое письмо.",
      })
    } finally {
      setTestingReminderEmail(false)
    }
  }

  const reminderSettingsPanel = (placement: ReminderPanelPlacement) => (
    <ReminderSettingsPanel
      timezone={timezone}
      reminderHour={reminderHour}
      notificationsEnabled={notificationsEnabled}
      reminderDays={reminderDays}
      disabled={!user}
      saving={savingSettings}
      status={settingsStatus}
      testSending={testingReminderEmail}
      dayOptions={[...REMINDER_DAY_OPTIONS]}
      headerAction={
        placement === "page" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => changeReminderPanelPlacement("profile")}
          >
            <UserCog className="size-4" />
            В профиль
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => changeReminderPanelPlacement("page")}
          >
            <PanelRightOpen className="size-4" />
            На экран
          </Button>
        )
      }
      onTimezoneChange={setTimezone}
      onReminderHourChange={setReminderHour}
      onNotificationsEnabledChange={setNotificationsEnabled}
      onReminderDaysChange={setReminderDays}
      onSendTestEmail={sendTestReminderEmail}
    />
  )
  const pageReady = reminderPlacementReady && themeReady
  const shouldRenderReminderPanel = pageReady && (reminderPanelPlacement === "page" || reminderPanelExiting)
  const shouldReserveReminderLayout = pageReady && reminderPanelPlacement === "page" && !reminderPanelExiting
  const reminderPanelMotionClass = reminderPanelExiting
    ? "reminder-panel-slide-out "
    : animateReminderPanel
      ? "reminder-panel-slide-in "
      : ""
  const reminderPanelPositionClass = reminderPanelExiting ? "absolute right-0 top-0 w-full max-w-[24rem] " : ""
  const pageShellClass = pageReady
    ? "min-h-screen overflow-x-hidden bg-background page-load-reveal"
    : "min-h-screen overflow-x-hidden bg-background page-load-pending"
  const headerContentClass = [
    "mx-auto w-full max-w-full transition-[max-width] duration-300 ease-out",
    shouldReserveReminderLayout ? "" : "xl:max-w-[calc(100%_-_24rem_-_1rem)]",
  ].join(" ")
  const calendarSectionClass =
    shouldReserveReminderLayout
      ? "space-y-4"
      : "mx-auto w-full max-w-full space-y-4 xl:max-w-[calc(100%_-_24rem_-_1rem)]"

  return (
    <div className={pageShellClass}>
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-3 py-4">
          <div className={`${headerContentClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <h1 className="w-full whitespace-nowrap text-[clamp(1.125rem,6vw,1.5rem)] font-bold leading-tight text-foreground sm:w-auto sm:text-2xl">
              Birthday Calendar{" "}
              <CountUp
                to={currentYear}
                duration={6}
                className="inline-block min-w-[4ch] text-right tabular-nums"
              />
            </h1>
            <div className={`${user ? "grid-cols-2" : "grid-cols-1"} grid w-full min-w-0 gap-2 sm:flex sm:w-auto sm:items-center`}>
              {user && (
                <ThemeSettingsPanel
                  theme={calendarTheme}
                  saving={themeSaving}
                  status={themeStatus}
                  className="min-w-0"
                  triggerClassName="w-full"
                  onChange={handleCalendarThemeChange}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAccountModal(true)}
                className="min-w-0 shrink justify-start gap-2 px-3 sm:w-auto sm:justify-center"
                title={authLoading && !user ? "Проверяем..." : user ? user.email : "Войти"}
              >
                <User className="size-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {authLoading && !user ? "Проверяем..." : user ? user.email : "Войти"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4">
        <div className={shouldReserveReminderLayout ? "relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]" : "relative grid gap-4"}>
          <section className={calendarSectionClass}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MONTHS.map((monthName, monthIndex) => {
                const byMonth = birthdays.filter((b) => {
                  return getBirthdayMonth(b) === monthIndex
                })
                return (
                  <Card key={monthIndex} className="border-border bg-transparent p-3 shadow-none sm:p-4">
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

          {shouldRenderReminderPanel && (
            <aside className={`${reminderPanelMotionClass}${reminderPanelPositionClass}overflow-visible`}>
              {reminderSettingsPanel("page")}
            </aside>
          )}
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
        passwordOnly={shouldRenderReminderPanel}
        onRemindersMoveToProfile={() => changeReminderPanelPlacement("profile")}
        reminderSettingsPanel={reminderSettingsPanel("profile")}
      />
    </div>
  )
}
