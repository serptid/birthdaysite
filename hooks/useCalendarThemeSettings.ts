"use client"

import { useEffect, useRef, useState } from "react"
import {
  CALENDAR_THEME_CACHE_KEY,
  DEFAULT_CALENDAR_THEME,
  getCalendarThemeCssVariables,
  normalizeCalendarTheme,
  parseCalendarThemeText,
  stringifyCalendarTheme,
  type CalendarTheme,
} from "@/lib/calendar-theme"
import { updateThemeFavicon } from "@/lib/theme-favicon"

type ThemeStatus = { type: "success" | "error"; text: string } | null

function readCachedCalendarTheme() {
  if (typeof window === "undefined") return DEFAULT_CALENDAR_THEME

  try {
    return parseCalendarThemeText(window.localStorage.getItem(CALENDAR_THEME_CACHE_KEY))
  } catch {
    return DEFAULT_CALENDAR_THEME
  }
}

function writeCachedCalendarTheme(theme: CalendarTheme) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(CALENDAR_THEME_CACHE_KEY, stringifyCalendarTheme(theme))
  } catch {}
}

export function useCalendarThemeSettings(canSave: boolean) {
  const [calendarTheme, setCalendarTheme] = useState<CalendarTheme>(DEFAULT_CALENDAR_THEME)
  const [themeReady, setThemeReady] = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeStatus, setThemeStatus] = useState<ThemeStatus>(null)
  const themeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const themeRequestId = useRef(0)
  const themeSaveInFlight = useRef(false)
  const pendingThemeSave = useRef<CalendarTheme | null>(null)
  const lastSavedTheme = useRef(JSON.stringify(DEFAULT_CALENDAR_THEME))

  useEffect(() => {
    const cachedTheme = readCachedCalendarTheme()
    setCalendarTheme(cachedTheme)
    lastSavedTheme.current = JSON.stringify(cachedTheme)
    pendingThemeSave.current = null
    setThemeReady(true)
  }, [])

  useEffect(() => {
    if (!themeReady) return

    const root = document.documentElement
    const variables = getCalendarThemeCssVariables(calendarTheme)

    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value)
    }
    writeCachedCalendarTheme(calendarTheme)
    updateThemeFavicon(calendarTheme)
  }, [calendarTheme, themeReady])

  function syncCalendarTheme(nextTheme?: CalendarTheme | null) {
    const normalizedTheme = normalizeCalendarTheme(nextTheme)
    setCalendarTheme(normalizedTheme)
    writeCachedCalendarTheme(normalizedTheme)
    setThemeReady(true)
    lastSavedTheme.current = JSON.stringify(normalizedTheme)
    pendingThemeSave.current = null
    setThemeSaving(false)
    setThemeStatus(null)
  }

  function handleCalendarThemeChange(nextTheme: CalendarTheme) {
    const normalizedTheme = normalizeCalendarTheme(nextTheme)
    setCalendarTheme(normalizedTheme)
    writeCachedCalendarTheme(normalizedTheme)
    setThemeReady(true)
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
      writeCachedCalendarTheme(savedTheme)
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
    themeReady,
    themeSaving,
    themeStatus,
    handleCalendarThemeChange,
    syncCalendarTheme,
  }
}
