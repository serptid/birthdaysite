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

  async function handleMagic() {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/auth/magic-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email }),
      })
      const data = await res.json()

      if (res.ok && data.sent === "login") {
        setMessage("Мы отправили ссылку для входа на ваш email. Откройте письмо и нажмите кнопку.")
      } else if (res.ok && data.sent === "verify") {
        setMessage("Отправили письмо для подтверждения и входа. Проверьте почту.")
      } else {
        setMessage("Ошибка: " + (data.error ?? "unknown"))
      }
    } catch {
      setMessage("Ошибка сети")
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
          <DialogTitle>Аккаунт</DialogTitle>
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
                  message.startsWith("Мы отправили") ||
                  message.startsWith("Отправили письмо")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleMagic}
                disabled={pending || !nickname || !email}
              >
                {pending ? "Подождите..." : "Вход / Регистрация"}
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
