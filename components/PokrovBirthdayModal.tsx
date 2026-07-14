"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MONTHS } from "@/constants/months"

type SharedBirthday = {
  id: number
  calendarId: number
  userId: number | null
  name: string
  date: string | null
  birthMonth: number | null
  birthDay: number | null
  birthYear: number | null
  note: string | null
  editedByEmail?: string | null
}

type PokrovBirthdayModalProps = {
  open: boolean
  onClose: () => void
  selectedDay: { month: number; day: number } | null
  year?: number
  currentUserId: number | null
  isAdmin: boolean
  onChanged?: () => void | Promise<void>
}

function byName(a: SharedBirthday, b: SharedBirthday) {
  return a.name.localeCompare(b.name, "ru")
}

export default function PokrovBirthdayModal({
  open,
  onClose,
  selectedDay,
  year,
  currentUserId,
  isAdmin,
  onChanged,
}: PokrovBirthdayModalProps) {
  const targetYear = year ?? new Date().getFullYear()
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [birthdays, setBirthdays] = useState<SharedBirthday[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SharedBirthday | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isoDate = useMemo(() => {
    if (!selectedDay) return null
    const month = String(selectedDay.month + 1).padStart(2, "0")
    const day = String(selectedDay.day).padStart(2, "0")
    return `${targetYear}-${month}-${day}`
  }, [selectedDay, targetYear])

  async function loadBirthdays() {
    if (!isoDate) return
    setLoadingList(true)
    try {
      const res = await fetch(`/api/shared/pokrov/birthday?date=${isoDate}`, { cache: "no-store" })
      const data = await res.json()
      setBirthdays(Array.isArray(data) ? data.sort(byName) : [])
    } catch {
      setBirthdays([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (open && isoDate) loadBirthdays()
  }, [open, isoDate])

  useEffect(() => {
    if (!open) return
    setName("")
    setNote("")
    setBirthYear("")
    setEditingId(null)
    setDeleteTarget(null)
    setMessage(null)
  }, [open, isoDate])

  function resetForm() {
    setName("")
    setNote("")
    setBirthYear("")
    setEditingId(null)
  }

  function canManage(birthday: SharedBirthday) {
    return isAdmin || birthday.userId === currentUserId
  }

  function startEdit(birthday: SharedBirthday) {
    if (!canManage(birthday)) return
    setEditingId(birthday.id)
    setName(birthday.name)
    setNote(birthday.note ?? "")
    setBirthYear(birthday.birthYear ? String(birthday.birthYear) : "")
    setMessage(null)
  }

  async function handleSave() {
    if (!selectedDay || !name.trim()) return
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch("/api/shared/pokrov/birthday", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          name: name.trim(),
          birthMonth: selectedDay.month + 1,
          birthDay: selectedDay.day,
          birthYear: birthYear.trim() ? Number(birthYear) : null,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage({ type: "error", text: data?.error || "Не удалось сохранить запись." })
        return
      }

      resetForm()
      await loadBirthdays()
      await onChanged?.()
      setMessage({ type: "success", text: editingId ? "Запись сохранена." : "Запись добавлена." })
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте еще раз." })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: number) {
    setMessage(null)
    setPending(true)
    try {
      const res = await fetch(`/api/shared/pokrov/birthday?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage({ type: "error", text: data?.error || "Не удалось удалить запись." })
        return
      }

      if (editingId === id) resetForm()
      await loadBirthdays()
      await onChanged?.()
      setDeleteTarget(null)
      setMessage({ type: "success", text: "Запись удалена." })
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте еще раз." })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-h-[calc(100svh-2rem)] sm:w-full sm:max-w-2xl sm:p-5 lg:max-w-5xl lg:p-6">
          <DialogHeader className="space-y-2 pr-9">
            <DialogTitle className="text-xl leading-tight sm:text-2xl">
              {editingId ? "Редактировать день рождения" : "Добавить день рождения"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Форма для добавления или редактирования дня рождения в общем календаре.
            </DialogDescription>
            {selectedDay && (
              <div className="w-fit rounded-md border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
                {selectedDay.day} {MONTHS[selectedDay.month]}
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
            <div className="space-y-4 rounded-md border bg-muted/10 p-3 sm:p-4">
              <div className="grid gap-2">
                <Label htmlFor="pokrov-modal-name">Имя</Label>
                <Input
                  id="pokrov-modal-name"
                  placeholder="Введите имя"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={pending}
                  className="h-10 bg-background/70 sm:h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pokrov-modal-note">Заметка (необязательно)</Label>
                <Input
                  id="pokrov-modal-note"
                  placeholder="Группа, партия или важная деталь"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={pending}
                  className="h-10 bg-background/70 sm:h-11"
                />
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
                  disabled={!selectedDay || !name.trim() || pending}
                >
                  {pending ? "Сохранение..." : editingId ? "Сохранить изменения" : isAdmin ? "Добавить запись" : "Сохранить мою запись"}
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
                <div className="text-sm font-medium">Записи на эту дату</div>
                <div className="rounded-full border bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                  {birthdays.length}
                </div>
              </div>

              <div className="max-h-[min(22rem,45svh)] overflow-auto pr-1 lg:max-h-[32rem]">
                {loadingList ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Загрузка...
                  </div>
                ) : birthdays.length === 0 ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Пока пусто
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {birthdays.map((birthday) => {
                      const manageable = canManage(birthday)

                      return (
                        <li key={birthday.id} className="rounded-md border bg-background/70 p-3">
                          <div className="flex flex-col gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="break-words text-base font-semibold">
                                {birthday.name}
                              </div>
                              {birthday.note && (
                                <div className="break-words text-xs text-muted-foreground">{birthday.note}</div>
                              )}
                              {isAdmin && (
                                <div className="break-words text-xs text-muted-foreground">
                                  Редактировал: {birthday.editedByEmail ?? "нет данных"}
                                </div>
                              )}
                            </div>

                            {manageable && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button className="w-full" size="sm" variant="outline" onClick={() => startEdit(birthday)} disabled={pending}>
                                  Изменить
                                </Button>
                                <Button className="w-full" size="sm" variant="outline" onClick={() => setDeleteTarget(birthday)} disabled={pending}>
                                  Удалить
                                </Button>
                              </div>
                            )}
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
              {deleteTarget ? `Запись "${deleteTarget.name}" будет удалена из общего календаря.` : ""}
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
