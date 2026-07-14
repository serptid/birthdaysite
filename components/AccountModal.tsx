"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RUSSIAN_TIMEZONES, formatRussianTimeZoneLabel } from "@/constants/timezones"

interface AccountModalProps {
  open: boolean
  onClose: () => void
  initialUser?: SessionUser | null
  authLoading?: boolean
  passwordOnly?: boolean
}

interface SessionUser {
  id: number
  email: string
  hasPassword?: boolean
  timezone?: string
  notificationsEnabled?: boolean
  reminderDays?: number[]
  reminderHour?: number
}

type AuthMode = "login" | "register" | "magic"
type Message = { type: "success" | "error"; text: string }

const REMINDER_HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function formatHour(hour: number) {
  return hour.toString().padStart(2, "0")
}

function currentAuthRedirect() {
  if (typeof window === "undefined") return "/"
  return window.location.pathname || "/"
}

function HourDial({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (hour: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative size-52 rounded-full border bg-muted/20 shadow-inner"
        aria-label="Выбор часа отправки"
        role="group"
      >
        <div className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border bg-background shadow-sm">
          <div className="text-2xl font-semibold tabular-nums">{formatHour(value)}:00</div>
        </div>

        {REMINDER_HOURS.map((hour) => {
          const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2
          const radius = 83
          const isSelected = hour === value

          return (
            <button
              key={hour}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Выбрать ${formatHour(hour)}:00`}
              disabled={disabled}
              onClick={() => onChange(hour)}
              className={[
                "absolute flex size-7 items-center justify-center rounded-full text-xs font-medium tabular-nums transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                disabled ? "cursor-not-allowed opacity-50" : "hover:bg-accent hover:text-accent-foreground",
                isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-foreground",
              ].join(" ")}
              style={{
                left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {formatHour(hour)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AccountModal({ open, onClose, initialUser, authLoading = false, passwordOnly = false }: AccountModalProps) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [user, setUser] = useState<SessionUser | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [pending, setPending] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(false)
  const [settingsTimezone, setSettingsTimezone] = useState("Europe/Moscow")
  const [settingsNotificationsEnabled, setSettingsNotificationsEnabled] = useState(true)
  const [settingsReminderDays, setSettingsReminderDays] = useState<number[]>([0, 1, 7])
  const [settingsReminderHour, setSettingsReminderHour] = useState(6)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  function applyAccount(nextUser: SessionUser) {
    setUser(nextUser)
    setSettingsTimezone(nextUser.timezone ?? "Europe/Moscow")
    setSettingsNotificationsEnabled(nextUser.notificationsEnabled ?? true)
    setSettingsReminderDays(nextUser.reminderDays?.length ? nextUser.reminderDays : [0, 1, 7])
    setSettingsReminderHour(nextUser.reminderHour ?? 6)
  }

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      setCheckingAccount(true)
      try {
        const accountRes = await fetch("/api/account", { cache: "no-store" })
        if (cancelled) return

        if (accountRes.ok) {
          const accountData = await accountRes.json()
          if (!cancelled && accountData.user) applyAccount(accountData.user)
          return
        }

        if (accountRes.status === 401) {
          setUser(null)
          return
        }

        const res = await fetch("/api/auth/me", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled) setUser(data.user ?? null)
      } catch {
        if (!cancelled && !initialUser) setUser(null)
      } finally {
        if (!cancelled) setCheckingAccount(false)
      }
    }

    if (open) {
      if (initialUser) {
        setUser((current) => current?.id === initialUser.id ? { ...current, ...initialUser } : initialUser)
      } else if (!authLoading) {
        setUser(null)
      }

      loadUser()
    } else {
      setCheckingAccount(false)
    }

    return () => {
      cancelled = true
    }
  }, [open, initialUser, authLoading])

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage(null)
  }

  async function handlePasswordLogin() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, redirectTo: currentAuthRedirect() }),
      })
      const data = await res.json()

      if (res.ok && data.user) {
        setUser(data.user)
        setPassword("")
        onClose()
      } else if (res.status === 401) {
        setMessage({ type: "error", text: "Неверный email или пароль." })
      } else if (res.status === 403) {
        setMessage({ type: "error", text: "Подтвердите email перед входом." })
      } else if (res.status === 429) {
        setMessage({ type: "error", text: "Слишком много запросов. Попробуйте позже." })
      } else {
        setMessage({ type: "error", text: "Ошибка: " + (data.error ?? "unknown") })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  function toggleReminderDay(day: number) {
    setSettingsReminderDays((current) => {
      if (current.includes(day)) {
        const next = current.filter((item) => item !== day)
        return next.length ? next : current
      }

      return [...current, day].sort((a, b) => a - b)
    })
  }

  async function handleSaveSettings() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: settingsTimezone.trim(),
          notificationsEnabled: settingsNotificationsEnabled,
          reminderDays: settingsReminderDays,
          reminderHour: settingsReminderHour,
        }),
      })
      const data = await res.json()

      if (res.ok && data.user) {
        setUser(data.user)
        setMessage({ type: "success", text: "Настройки сохранены." })
      } else {
        setMessage({ type: "error", text: "Не удалось сохранить настройки." })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  async function handleSavePassword() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      })

      if (res.ok) {
        setCurrentPassword("")
        setNewPassword("")
        setUser((current) => current ? { ...current, hasPassword: true } : current)
        setMessage({ type: "success", text: "Пароль сохранён." })
      } else if (res.status === 403) {
        setMessage({ type: "error", text: "Текущий пароль указан неверно." })
      } else {
        setMessage({ type: "error", text: "Не удалось сохранить пароль." })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  async function handleRegister() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (res.ok && data.need_verify) {
        setPassword("")
        setMessage({ type: "success", text: "Отправили письмо для подтверждения. После клика вы войдёте в аккаунт." })
      } else if (res.status === 409) {
        setMessage({ type: "error", text: "Аккаунт уже существует. Используйте вход по паролю или вход без пароля." })
      } else if (res.status === 429) {
        setMessage({ type: "error", text: "Слишком много запросов. Попробуйте позже." })
      } else if (res.status === 400) {
        setMessage({ type: "error", text: "Введите корректный email и пароль не короче 8 символов." })
      } else {
        setMessage({ type: "error", text: "Ошибка: " + (data.error ?? "unknown") })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  async function handleMagic() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/magic-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo: currentAuthRedirect() }),
      })
      const data = await res.json()

      if (res.ok && data.sent === "ok") {
        setMessage({ type: "success", text: "Если этот email можно использовать, мы отправили письмо со ссылкой для входа." })
      } else if (res.status === 429) {
        setMessage({ type: "error", text: "Слишком много запросов. Попробуйте позже." })
      } else {
        setMessage({ type: "error", text: "Ошибка: " + (data.error ?? "unknown") })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  async function handlePasswordResetRequest() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.sent === "ok") {
        setMessage({ type: "success", text: "Если этот email есть в системе, мы отправили ссылку для восстановления пароля." })
      } else if (res.status === 429) {
        setMessage({ type: "error", text: "Слишком много запросов. Попробуйте позже." })
      } else if (res.status === 400) {
        setMessage({ type: "error", text: "Введите корректный email." })
      } else {
        setMessage({ type: "error", text: "Ошибка: " + (data.error ?? "unknown") })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети" })
    } finally {
      setPending(false)
    }
  }

  async function handleLogout() {
    setPending(true)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        setUser(null)
        onClose()
      }
    } finally {
      setPending(false)
    }
  }

  const visibleUser = user ?? (open ? initialUser ?? null : null)
  const showAccountCheck = open && !visibleUser && (authLoading || checkingAccount)
  const controlsDisabled = pending || checkingAccount

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={
          visibleUser
            ? passwordOnly
              ? "sm:max-w-2xl"
              : "sm:max-w-5xl lg:max-w-6xl"
            : "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
        }
      >
        <DialogHeader>
          <DialogTitle>Аккаунт</DialogTitle>
          <DialogDescription className="sr-only">
            Вход, регистрация, настройки уведомлений и управление паролем аккаунта.
          </DialogDescription>
        </DialogHeader>

        {showAccountCheck ? (
          <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
            Проверяем аккаунт...
          </div>
        ) : !visibleUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant={mode === "login" ? "default" : "outline"} size="sm" onClick={() => switchMode("login")} disabled={pending}>
                Вход
              </Button>
              <Button variant={mode === "register" ? "default" : "outline"} size="sm" onClick={() => switchMode("register")} disabled={pending}>
                Регистрация
              </Button>
              <Button variant={mode === "magic" ? "default" : "outline"} size="sm" onClick={() => switchMode("magic")} disabled={pending}>
                Без пароля
              </Button>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>

            {mode !== "magic" && (
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                />
              </div>
            )}

            {mode === "login" && (
              <Button
                variant="link"
                className="h-auto px-0 text-sm"
                onClick={handlePasswordResetRequest}
                disabled={pending || !email.trim()}
              >
                Забыли пароль?
              </Button>
            )}

            {message && (
              <p
                className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
              >
                {message.text}
              </p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={mode === "login" ? handlePasswordLogin : mode === "register" ? handleRegister : handleMagic}
                disabled={pending || !email.trim() || (mode !== "magic" && password.length < 8)}
              >
                {pending
                  ? "Подождите..."
                  : mode === "login"
                    ? "Войти"
                    : mode === "register"
                      ? "Создать аккаунт"
                      : "Отправить ссылку"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                Вы вошли как <strong>{visibleUser.email}</strong>
              </p>
              <div className="flex gap-2">
                <Button onClick={handleLogout} variant="destructive" disabled={pending}>
                  {pending ? "Выход..." : "Выйти"}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={pending}>
                  Закрыть
                </Button>
              </div>
            </div>
            {checkingAccount && (
              <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                Загружаем настройки аккаунта...
              </div>
            )}

            <div className={passwordOnly ? "grid gap-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]"}>
              {!passwordOnly && (
              <div className="space-y-3 rounded border p-3">
                <div className="text-sm font-medium">Настройки уведомлений</div>
                <div className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_auto]">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="timezone">Таймзона</Label>
                      <Select value={settingsTimezone} onValueChange={setSettingsTimezone} disabled={controlsDisabled}>
                        <SelectTrigger id="timezone" className="w-full">
                          <SelectValue placeholder="Выберите город" />
                        </SelectTrigger>
                        <SelectContent>
                          {RUSSIAN_TIMEZONES.map((item) => (
                            <SelectItem key={item.timeZone} value={item.timeZone}>
                              {formatRussianTimeZoneLabel(item.city, item.timeZone)}
                            </SelectItem>
                          ))}
                          {!RUSSIAN_TIMEZONES.some((item) => item.timeZone === settingsTimezone) && settingsTimezone && (
                            <SelectItem value={settingsTimezone}>{settingsTimezone}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={settingsNotificationsEnabled}
                        onChange={(e) => setSettingsNotificationsEnabled(e.target.checked)}
                        disabled={controlsDisabled}
                      />
                      Email-напоминания включены
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Напоминать за</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[0, 1, 3, 7].map((day) => (
                          <label key={day} className="flex items-center gap-2 rounded border px-2 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settingsReminderDays.includes(day)}
                              onChange={() => toggleReminderDay(day)}
                              disabled={controlsDisabled}
                            />
                            {day === 0 ? "Сегодня" : `${day} дн.`}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={controlsDisabled || !settingsTimezone.trim()}>
                      Сохранить настройки
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Час отправки</Label>
                    <HourDial
                      value={settingsReminderHour}
                      onChange={setSettingsReminderHour}
                      disabled={controlsDisabled}
                    />
                  </div>
                </div>
              </div>
              )}

              <div className="space-y-3 rounded border p-3">
                <div className="text-sm font-medium">{visibleUser.hasPassword ? "Смена пароля" : "Задать пароль"}</div>
                {visibleUser.hasPassword && (
                  <div className="grid gap-2">
                    <Label htmlFor="currentPassword">Текущий пароль</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={controlsDisabled}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Минимум 8 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={controlsDisabled}
                  />
                </div>
                <Button
                  onClick={handleSavePassword}
                  disabled={controlsDisabled || newPassword.length < 8 || (Boolean(visibleUser.hasPassword) && !currentPassword)}
                >
                  {visibleUser.hasPassword ? "Сменить пароль" : "Задать пароль"}
                </Button>
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {message.text}
              </p>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
