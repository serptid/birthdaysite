"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Bell, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TIMEZONE_GROUPS,
  getTimeZoneOption,
  formatUtcOffset,
  type TimeZoneOption,
} from "@/constants/timezones"

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
  testSending?: boolean
  dayOptions: ReminderDayOption[]
  headerAction?: ReactNode
  onSendTestEmail?: () => void
  onTimezoneChange: (timezone: string) => void
  onReminderHourChange: (hour: number) => void
  onNotificationsEnabledChange: (enabled: boolean) => void
  onReminderDaysChange: (days: number[]) => void
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function fallbackTimeZoneOption(timeZone: string): TimeZoneOption {
  try {
    return {
      label: timeZone.replaceAll("_", " "),
      timeZone,
      offset: formatUtcOffset(timeZone),
    }
  } catch {
    return {
      label: timeZone,
      timeZone,
      offset: "UTC",
    }
  }
}

function TimeZoneOptionLabel({ option, trigger }: { option: TimeZoneOption; trigger?: boolean }) {
  return (
    <span
      className={[
        "grid min-w-0 grid-cols-[minmax(0,1fr)_5.25rem] items-center gap-3 text-left",
        trigger ? "w-full" : "w-[min(23rem,calc(100vw-4.5rem))]",
      ].join(" ")}
    >
      <span className="min-w-0 truncate justify-self-start">{option.label}</span>
      <span className="text-right text-muted-foreground tabular-nums">{option.offset}</span>
    </span>
  )
}

export default function ReminderSettingsPanel({
  timezone,
  reminderHour,
  notificationsEnabled,
  reminderDays,
  disabled,
  saving,
  status,
  testSending,
  dayOptions,
  headerAction,
  onSendTestEmail,
  onTimezoneChange,
  onReminderHourChange,
  onNotificationsEnabledChange,
  onReminderDaysChange,
}: ReminderSettingsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const controlsDisabled = !mounted || Boolean(disabled)
  const selectedTimeZoneOption = getTimeZoneOption(timezone) ?? fallbackTimeZoneOption(timezone)

  useEffect(() => {
    setMounted(true)
  }, [])

  function toggleReminderDay(day: number) {
    if (reminderDays.includes(day)) {
      const nextDays = reminderDays.filter((item) => item !== day)
      if (nextDays.length > 0) onReminderDaysChange(nextDays)
      return
    }

    onReminderDaysChange([...reminderDays, day].sort((a, b) => a - b))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
              disabled={controlsDisabled}
            />
            Получать письма обо всех ДР
          </label>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Когда напоминать</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {dayOptions.map((option) => (
                <label key={option.value} className="flex min-h-11 items-center gap-2 rounded border px-2 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reminderDays.includes(option.value)}
                    onChange={() => toggleReminderDay(option.value)}
                    disabled={controlsDisabled}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Таймзона</Label>
            <Select value={timezone} onValueChange={onTimezoneChange} disabled={controlsDisabled}>
              <SelectTrigger className="w-full [&>span]:flex-1">
                <TimeZoneOptionLabel option={selectedTimeZoneOption} trigger />
              </SelectTrigger>
              <SelectContent className="max-h-[min(24rem,calc(100svh-6rem))] min-w-[min(27rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]">
                {!getTimeZoneOption(timezone) && (
                  <>
                    <SelectItem value={selectedTimeZoneOption.timeZone} className="py-2 pr-10">
                      <TimeZoneOptionLabel option={selectedTimeZoneOption} />
                    </SelectItem>
                    <SelectSeparator />
                  </>
                )}
                {TIMEZONE_GROUPS.map((group, groupIndex) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((item) => (
                      <SelectItem key={item.timeZone} value={item.timeZone} className="py-2 pr-10">
                        <TimeZoneOptionLabel option={item} />
                      </SelectItem>
                    ))}
                    {groupIndex < TIMEZONE_GROUPS.length - 1 && <SelectSeparator />}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Время отправки</Label>
            <Select
              value={String(reminderHour)}
              onValueChange={(value) => onReminderHourChange(Number(value))}
              disabled={controlsDisabled}
            >
              <SelectTrigger className="w-full sm:w-[8rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="max-h-[min(18rem,calc(100svh-6rem))] min-w-[7rem]">
                {HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)} className="py-2">
                    {pad2(hour)}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {saving && !status && (
            <div className="text-sm text-muted-foreground">Сохраняем...</div>
          )}
        </div>
      </div>

      {onSendTestEmail && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onSendTestEmail}
          disabled={controlsDisabled || testSending}
        >
          <MailCheck className="size-4" />
          {testSending ? "Отправляем..." : "Проверить отправку письма"}
        </Button>
      )}

      {status && (
        <div className={status.type === "success" ? "text-sm text-green-500" : "text-sm text-red-500"}>
          {status.text}
        </div>
      )}
    </div>
  )
}
