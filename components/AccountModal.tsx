"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AccountModalProps {
  open: boolean
  onClose: () => void
}

interface SessionUser {
  id: number
  nickname: string
  email: string
}

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [user, setUser] = useState<SessionUser | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        const data = await res.json()
        setUser(data.user ?? null)
      } catch {
        setUser(null)
      }
    }
    if (open) loadUser()
  }, [open])

  async function handleRegister() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email }),
      })
      const data = await res.json()
      if (res.ok && data.need_verify) {
        setMessage("Регистрация прошла. Проверьте почту и подтвердите email.")
      } else {
        setMessage("Ошибка регистрации: " + (data.error ?? "unknown"))
      }
    } catch {
      setMessage("Ошибка сети при регистрации")
    } finally {
      setPending(false)
    }
  }

  async function handleLogin() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email }),
      })
      const data = await res.json()

      if (res.ok && data.need_magic) {
        setMessage("Мы отправили ссылку для входа на ваш email. Откройте письмо и нажмите кнопку.")
        return
      }
      if (res.ok) {
        setUser(data)
        onClose()
        return
      }
      if (data.error === "email_not_verified") {
        setMessage("Подтвердите email перед входом.")
      } else if (data.error === "user_not_found") {
        setMessage("Пользователь не найден.")
      } else {
        setMessage("Ошибка входа: " + (data.error ?? "unknown"))
      }
    } catch {
      setMessage("Ошибка сети при входе")
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки аккаунта</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="Ваше имя"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={pending}
              />
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

            {message && (
              <p
                className={`text-sm ${
                  message.startsWith("Регистрация прошла") ||
                  message.startsWith("Мы отправили")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleLogin} disabled={pending || !nickname || !email}>
                {pending ? "Подождите..." : "Войти"}
              </Button>
              <Button
                className="flex-1"
                onClick={handleRegister}
                variant="outline"
                disabled={pending || !nickname || !email}
              >
                {pending ? "Подождите..." : "Зарегистрироваться"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Вы вошли как <strong>{user.nickname}</strong> ({user.email})
            </p>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleLogout} variant="destructive" disabled={pending}>
                {pending ? "Выход..." : "Выйти"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
