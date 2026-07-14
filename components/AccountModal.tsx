"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PanelRightOpen, UserCog } from "lucide-react"
import ReminderSettingsPanel from "@/components/ReminderSettingsPanel"

interface AccountModalProps {
  open: boolean
  onClose: () => void
  initialUser?: SessionUser | null
  authLoading?: boolean
  passwordOnly?: boolean
  onRemindersMoveToProfile?: () => void
  onRemindersMoveToPage?: () => void
  reminderSettingsPanel?: ReactNode
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

const REMINDER_DAY_OPTIONS = [
  { value: 0, label: "В день" },
  { value: 1, label: "За день" },
  { value: 7, label: "За неделю" },
] as const

function currentAuthRedirect() {
  if (typeof window === "undefined") return "/"
  return window.location.pathname || "/"
}

export default function AccountModal({
  open,
  onClose,
  initialUser,
  authLoading = false,
  passwordOnly = false,
  onRemindersMoveToProfile,
  onRemindersMoveToPage,
  reminderSettingsPanel,
}: AccountModalProps) {
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

            {passwordOnly && onRemindersMoveToProfile && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRemindersMoveToProfile}
                  disabled={controlsDisabled}
                >
                  <UserCog className="size-4" />
                  Напоминания в профиль
                </Button>
              </div>
            )}

            <div className={passwordOnly ? "grid gap-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]"}>
              {!passwordOnly && (
                reminderSettingsPanel ?? (
                  <ReminderSettingsPanel
                    timezone={settingsTimezone}
                    reminderHour={settingsReminderHour}
                    notificationsEnabled={settingsNotificationsEnabled}
                    reminderDays={settingsReminderDays}
                    disabled={controlsDisabled}
                    saving={pending}
                    dayOptions={[...REMINDER_DAY_OPTIONS]}
                    headerAction={
                      onRemindersMoveToPage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onRemindersMoveToPage}
                          disabled={controlsDisabled}
                        >
                          <PanelRightOpen className="size-4" />
                          На экран
                        </Button>
                      ) : null
                    }
                    onTimezoneChange={setSettingsTimezone}
                    onReminderHourChange={setSettingsReminderHour}
                    onNotificationsEnabledChange={setSettingsNotificationsEnabled}
                    onReminderDaysChange={setSettingsReminderDays}
                    onSave={handleSaveSettings}
                  />
                )
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
