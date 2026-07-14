"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MONTHS } from "@/constants/months"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BirthdayModalProps {
  open: boolean
  onClose: () => void
  selectedDay: { month: number; day: number } | null
  year?: number
  onChanged?: () => void | Promise<void>
}

type Person = {
  id: number
  name: string
  note: string | null
  date: string // "YYYY-MM-DD"
  birthMonth?: number | null
  birthDay?: number | null
  birthYear?: number | null
}

function getAgeOnYear(birthYear: number | null | undefined, targetYear: number) {
  if (!birthYear || !Number.isInteger(birthYear)) return null
  const age = targetYear - birthYear
  return age >= 0 ? age : null
}

function parseBirthYear(value: string) {
  if (!value.trim()) return null
  const year = Number(value)
  return Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : null
}

function pluralYears(age: number) {
  const mod10 = age % 10
  const mod100 = age % 100

  if (mod10 === 1 && mod100 !== 11) return "год"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "года"
  return "лет"
}

export default function BirthdayModal({
  open,
  onClose,
  selectedDay,
  year,
  onChanged,
}: BirthdayModalProps) {
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const targetYear = year ?? new Date().getFullYear()
  const previewAge = getAgeOnYear(parseBirthYear(birthYear), targetYear)

  const isoDate = useMemo(() => {
    if (!selectedDay) return null
    const m = String(selectedDay.month + 1).padStart(2, "0")
    const d = String(selectedDay.day).padStart(2, "0")
    return `${targetYear}-${m}-${d}`
  }, [selectedDay, targetYear])

  async function loadPeople() {
    if (!isoDate) return
    setLoadingList(true)
    try {
      const r = await fetch(`/api/people?date=${isoDate}`, { cache: "no-store" })
      const data = await r.json()
      setPeople(Array.isArray(data) ? data : [])
    } catch {
      setPeople([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (open && isoDate) loadPeople()
  }, [open, isoDate])

  useEffect(() => {
    if (!open) return
    setName("")
    setNote("")
    setBirthYear("")
    setEditingId(null)
    setMessage(null)
  }, [open, isoDate])

  function resetForm() {
    setName("")
    setNote("")
    setBirthYear("")
    setEditingId(null)
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setName(person.name)
    setNote(person.note ?? "")
    setBirthYear(person.birthYear ? String(person.birthYear) : "")
    setMessage(null)
  }

  function personAge(person: Person) {
    return getAgeOnYear(person.birthYear, targetYear)
  }

  async function handleSave() {
    if (!isoDate || !name.trim()) return
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/people", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          name: name.trim(),
          birthMonth: selectedDay?.month !== undefined ? selectedDay.month + 1 : undefined,
          birthDay: selectedDay?.day,
          birthYear: birthYear.trim() ? Number(birthYear) : null,
          note: note.trim() || null,
        }),
      })
      if (res.status === 401) {
        setMessage({ type: "error", text: "Чтобы добавлять даты, сначала войдите или зарегистрируйтесь." })
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage({ type: "error", text: data?.error || "Не удалось сохранить запись." })
        return
      }
      resetForm()
      await loadPeople()
      await onChanged?.()
      setMessage({ type: "success", text: "Запись сохранена." })
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: number) {
    setMessage(null)
    setPending(true)
    try {
      const r = await fetch(`/api/people?id=${id}`, { method: "DELETE" })
      if (r.status === 401) {
        setMessage({ type: "error", text: "Требуется вход для удаления записей." })
        return
      }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        setMessage({ type: "error", text: data?.error || "Не удалось удалить запись." })
        return
      }
      if (editingId === id) resetForm()
      await loadPeople()
      await onChanged?.()
      setDeleteTarget(null)
      setMessage({ type: "success", text: "Запись удалена." })
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-h-[calc(100svh-2rem)] sm:w-full sm:max-w-2xl sm:p-5 lg:max-w-5xl lg:p-6">
          <DialogHeader className="space-y-2 pr-9">
            <DialogTitle className="text-xl leading-tight sm:text-2xl">
              {editingId ? "Редактировать день рождения" : "Добавить день рождения"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Форма для добавления или редактирования дня рождения и список людей на выбранную дату.
            </DialogDescription>
            {selectedDay && (
              <div className="w-fit rounded-md border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
                {selectedDay.day} {MONTHS[selectedDay.month]} {targetYear}
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
            <div className="space-y-4 rounded-md border bg-muted/10 p-3 sm:p-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  placeholder="Введите имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  className="h-10 bg-background/70 sm:h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Заметка (необязательно)</Label>
                <Input
                  id="note"
                  placeholder="Подарок, идея или важная деталь"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={pending}
                  className="h-10 bg-background/70 sm:h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthYear">Год рождения (необязательно)</Label>
                <Input
                  id="birthYear"
                  type="number"
                  min={1900}
                  max={9999}
                  placeholder="Например, 1995"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  disabled={pending}
                  className="h-10 bg-background/70 sm:h-11"
                />
                {previewAge !== null && selectedDay && (
                  <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-500">
                    В этот день исполнится {previewAge} {pluralYears(previewAge)}.
                  </div>
                )}
              </div>
              {message && (
                <div className={message.type === "success" ? "text-sm font-medium text-green-600" : "text-sm font-medium text-red-500"}>
                  {message.text}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 pt-2 sm:flex sm:flex-wrap">
                <Button
                  className="w-full sm:flex-1"
                  onClick={handleSave}
                  disabled={!isoDate || !name.trim() || pending}
                >
                  {pending ? "Сохранение..." : editingId ? "Сохранить изменения" : "Сохранить"}
                </Button>
                {editingId && (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={resetForm} disabled={pending}>
                    Отмена
                  </Button>
                )}
              </div>
            </div>

            <div className="h-fit space-y-3 rounded-md border bg-muted/10 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Люди на эту дату</div>
                <div className="rounded-full border bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                  {people.length}
                </div>
              </div>
              <div className="max-h-[min(22rem,45svh)] overflow-auto pr-1 lg:max-h-[32rem]">
                {loadingList ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Загрузка…
                  </div>
                ) : people.length === 0 ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Пока пусто
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {people.map((p) => {
                      const age = personAge(p)

                      return (
                        <li key={p.id} className="rounded-md border bg-background/70 p-3">
                          <div className="flex flex-col gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="break-words text-base font-semibold">
                                {age !== null ? (
                                  <>
                                    {p.name} <span className="whitespace-nowrap">- {age} г.</span>
                                  </>
                                ) : (
                                  p.name
                                )}
                              </div>
                              {p.note && (
                                <div className="break-words text-xs text-muted-foreground">{p.note}</div>
                              )}
                              {p.birthYear && (
                                <div className="text-xs text-muted-foreground">Родился в {p.birthYear}</div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button className="w-full" size="sm" variant="outline" onClick={() => startEdit(p)} disabled={pending}>
                                Изменить
                              </Button>
                              <Button className="w-full" size="sm" variant="outline" onClick={() => setDeleteTarget(p)} disabled={pending}>
                                Удалить
                              </Button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Запись "${deleteTarget.name}" будет удалена из календаря.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget.id)} disabled={pending}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
