"use client"

import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_CALENDAR_THEME,
  getCalendarThemeCssVariables,
  normalizeCalendarTheme,
  type CalendarTheme,
} from "@/lib/calendar-theme"

type ThemeStatus = { type: "success" | "error"; text: string } | null

export function useCalendarThemeSettings(canSave: boolean) {
  const [calendarTheme, setCalendarTheme] = useState<CalendarTheme>(DEFAULT_CALENDAR_THEME)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeStatus, setThemeStatus] = useState<ThemeStatus>(null)
  const themeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const themeRequestId = useRef(0)
  const themeSaveInFlight = useRef(false)
  const pendingThemeSave = useRef<CalendarTheme | null>(null)
  const lastSavedTheme = useRef(JSON.stringify(DEFAULT_CALENDAR_THEME))

  useEffect(() => {
    const root = document.documentElement
    const variables = getCalendarThemeCssVariables(calendarTheme)

    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value)
    }

    return () => {
      for (const name of Object.keys(variables)) {
        root.style.removeProperty(name)
      }
    }
  }, [calendarTheme])

  function syncCalendarTheme(nextTheme?: CalendarTheme | null) {
    const normalizedTheme = normalizeCalendarTheme(nextTheme)
    setCalendarTheme(normalizedTheme)
    lastSavedTheme.current = JSON.stringify(normalizedTheme)
    pendingThemeSave.current = null
    setThemeSaving(false)
    setThemeStatus(null)
  }

  function handleCalendarThemeChange(nextTheme: CalendarTheme) {
    const normalizedTheme = normalizeCalendarTheme(nextTheme)
    setCalendarTheme(normalizedTheme)
    setThemeStatus(null)
  }

  async function flushThemeSave() {
    if (themeSaveInFlight.current) return

    const nextTheme = pendingThemeSave.current
    if (!nextTheme) {
      setThemeSaving(false)
      return
    }

    const serializedTheme = JSON.stringify(nextTheme)
    if (serializedTheme === lastSavedTheme.current) {
      pendingThemeSave.current = null
      setThemeSaving(false)
      return
    }

    pendingThemeSave.current = null
    themeSaveInFlight.current = true
    const requestId = themeRequestId.current + 1
    themeRequestId.current = requestId

    try {
      const res = await fetch("/api/account/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarTheme: nextTheme }),
      })

      if (!res.ok) throw new Error("theme_save_failed")

      const data = await res.json()
      const savedTheme = normalizeCalendarTheme(data.calendarTheme)
      if (themeRequestId.current !== requestId) return

      lastSavedTheme.current = JSON.stringify(savedTheme)
      setCalendarTheme((current) =>
        JSON.stringify(current) === serializedTheme ? savedTheme : current
      )
      if (!pendingThemeSave.current) {
        setThemeStatus({ type: "success", text: "Сохранено" })
      }
    } catch {
      if (themeRequestId.current === requestId && !pendingThemeSave.current) {
        setThemeStatus({ type: "error", text: "Не удалось сохранить" })
      }
    } finally {
      if (themeRequestId.current !== requestId) return
      themeSaveInFlight.current = false

      if (pendingThemeSave.current && JSON.stringify(pendingThemeSave.current) !== lastSavedTheme.current) {
        if (themeSaveTimer.current) clearTimeout(themeSaveTimer.current)
        themeSaveTimer.current = setTimeout(() => {
          void flushThemeSave()
        }, 200)
        return
      }

      setThemeSaving(false)
    }
  }

  useEffect(() => {
    if (!canSave) return

    const serializedTheme = JSON.stringify(calendarTheme)
    if (serializedTheme === lastSavedTheme.current) {
      pendingThemeSave.current = null
      if (!themeSaveInFlight.current) setThemeSaving(false)
      return
    }

    pendingThemeSave.current = calendarTheme
    setThemeSaving(true)

    if (!themeSaveInFlight.current) {
      if (themeSaveTimer.current) clearTimeout(themeSaveTimer.current)
      themeSaveTimer.current = setTimeout(() => {
        void flushThemeSave()
      }, 200)
    }

    return () => {
      if (themeSaveTimer.current) {
        clearTimeout(themeSaveTimer.current)
        themeSaveTimer.current = null
      }
    }
  }, [calendarTheme, canSave])

  return {
    calendarTheme,
    themeSaving,
    themeStatus,
    handleCalendarThemeChange,
    syncCalendarTheme,
  }
}
