"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MONTHS } from "@/constants/months"

interface BirthdayModalProps {
  open: boolean
  onClose: () => void
  selectedDay: { month: number; day: number } | null
  year?: number
}

type Person = {
  id: number
  name: string
  note: string | null
  date: string // "YYYY-MM-DD"
}

export default function BirthdayModal({
  open,
  onClose,
  selectedDay,
  year,
}: BirthdayModalProps) {
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const isoDate = useMemo(() => {
    if (!selectedDay) return null
    const y = year ?? new Date().getFullYear()
    const m = String(selectedDay.month + 1).padStart(2, "0")
    const d = String(selectedDay.day).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [selectedDay, year])

  async function loadPeople() {
    if (!isoDate) return
    setLoadingList(true)
    try {
      const r = await fetch(`/api/people?date=${isoDate}`, { cache: "no-store" })
      const data = await r.json()
      setPeople(Array.isArray(data) ? data : [])
    } catch { setPeople([]) }
    finally { setLoadingList(false) }
  }

  useEffect(() => {
    if (open && isoDate) loadPeople()
  }, [open, isoDate])

  async function handleSave() {
    if (!isoDate || !name.trim()) return
    setPending(true)
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date: isoDate, note: note.trim() || null }),
      })
      if (res.status === 401) {
        alert("Чтобы добавлять даты, сначала войдите или зарегистрируйтесь.")
        onClose()
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || "save_failed")
        return
      }
      setName("")
      setNote("")
      await loadPeople()
    } catch { alert("network_error") }
    finally { setPending(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить запись?")) return
    try {
      const r = await fetch(`/api/people?id=${id}`, { method: "DELETE" })
      if (r.status === 401) {
        alert("Требуется вход для удаления записей.")
        onClose()
        return
      }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        alert(data?.error || "delete_failed")
        return
      }
      await loadPeople()
    } catch { alert("network_error") }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Добавить день рождения
            {selectedDay && ` — ${selectedDay.day} ${MONTHS[selectedDay.month]}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Форма */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                placeholder="Введите имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="pb-2" htmlFor="note">Заметка (необязательно)</Label>
              <Input
                id="note"
                placeholder="Подарок, возраст и т.д."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">Дата: {isoDate ?? "—"}</div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!isoDate || !name.trim() || pending}
              >
                {pending ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Отмена
              </Button>
            </div>
          </div>

          {/* Список людей на дату */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Люди на эту дату</div>
            <div className="rounded border p-2 max-h-72 overflow-auto">
              {loadingList ? (
                <div className="text-sm text-muted-foreground">Загрузка…</div>
              ) : people.length === 0 ? (
                <div className="text-sm text-muted-foreground">Пока пусто</div>
              ) : (
                <ul className="space-y-2">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-2 border-b pb-2 last:border-b-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        {p.note && (
                          <div className="text-xs text-muted-foreground truncate">{p.note}</div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}>
                        Удалить
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
