"use client"

import type { ReactNode } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RUSSIAN_TIMEZONES, formatRussianTimeZoneLabel } from "@/constants/timezones"

type ReminderStatus = { type: "success" | "error"; text: string } | null

type ReminderDayOption = {
  value: number
  label: string
}

interface ReminderSettingsPanelProps {
  timezone: string
  reminderHour: number
  notificationsEnabled: boolean
  reminderDays: number[]
  disabled?: boolean
  saving?: boolean
  status?: ReminderStatus
  dayOptions: ReminderDayOption[]
  headerAction?: ReactNode
  onTimezoneChange: (timezone: string) => void
  onReminderHourChange: (hour: number) => void
  onNotificationsEnabledChange: (enabled: boolean) => void
  onReminderDaysChange: (days: number[]) => void
  onSave: () => void
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export default function ReminderSettingsPanel({
  timezone,
  reminderHour,
  notificationsEnabled,
  reminderDays,
  disabled,
  saving,
  status,
  dayOptions,
  headerAction,
  onTimezoneChange,
  onReminderHourChange,
  onNotificationsEnabledChange,
  onReminderDaysChange,
  onSave,
}: ReminderSettingsPanelProps) {
  function toggleReminderDay(day: number) {
    onReminderDaysChange(
      reminderDays.includes(day)
        ? reminderDays.filter((item) => item !== day)
        : [...reminderDays, day].sort((a, b) => a - b)
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="size-4" />
            Напоминания
          </div>
          {headerAction}
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) => onNotificationsEnabledChange(event.target.checked)}
              disabled={disabled}
            />
            Получать письма обо всех ДР
          </label>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Когда напоминать</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {dayOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded border px-2 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reminderDays.includes(option.value)}
                    onChange={() => toggleReminderDay(option.value)}
                    disabled={disabled}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Таймзона</Label>
            <Select value={timezone} onValueChange={onTimezoneChange} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUSSIAN_TIMEZONES.map((item) => (
                  <SelectItem key={item.timeZone} value={item.timeZone}>
                    {formatRussianTimeZoneLabel(item.city, item.timeZone)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Время отправки</Label>
            <Select
              value={String(reminderHour)}
              onValueChange={(value) => onReminderHourChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {pad2(hour)}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" variant="outline" onClick={onSave} disabled={disabled}>
            {saving ? "Сохраняем..." : "Сохранить напоминания"}
          </Button>
        </div>
      </div>

      {status && (
        <div className={status.type === "success" ? "text-sm text-green-500" : "text-sm text-red-500"}>
          {status.text}
        </div>
      )}
    </div>
  )
}
