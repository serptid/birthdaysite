"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Message = { type: "success" | "error"; text: string }

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams])
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setMessage(null)

    if (!token) {
      setMessage({ type: "error", text: "Ссылка восстановления некорректна." })
      return
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "Пароль должен быть не короче 8 символов." })
      return
    }

    if (password !== repeatPassword) {
      setMessage({ type: "error", text: "Пароли не совпадают." })
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (res.ok) {
        setDone(true)
        setPassword("")
        setRepeatPassword("")
        setMessage({ type: "success", text: "Пароль обновлён. Вы вошли в аккаунт." })
      } else if (res.status === 400) {
        setMessage({ type: "error", text: "Ссылка устарела или уже была использована." })
      } else {
        setMessage({ type: "error", text: "Ошибка: " + (data.error ?? "unknown") })
      }
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <Card className="w-full p-6">
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold">Восстановление пароля</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Задайте новый пароль для аккаунта BDsite.
            </p>
          </div>

          {!done && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Новый пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending || !token}
                />
              </div>
              <div>
                <Label htmlFor="repeatPassword">Повторите пароль</Label>
                <Input
                  id="repeatPassword"
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  disabled={pending || !token}
                />
              </div>
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-2">
            {!done ? (
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={pending || !token || password.length < 8 || repeatPassword.length < 8}
              >
                {pending ? "Сохранение..." : "Сохранить пароль"}
              </Button>
            ) : (
              <Button asChild className="flex-1">
                <Link href="/">Открыть календарь</Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </main>
  )
}
