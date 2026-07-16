"use client";

import { useEffect, useState } from "react";
import {
  Cat,
  ChalkboardSimple,
  Coffee,
  FlowerLotus,
  Leaf,
  MoonStars,
  PaintBrush,
  RocketLaunch,
  Snowflake,
  Sparkle,
  Sun,
  type Icon,
} from "@phosphor-icons/react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIconGlyph } from "@/components/AppIconGlyph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CALENDAR_THEME_PALETTE,
  CALENDAR_THEME_FIELDS,
  CALENDAR_THEME_PRESETS,
  CUSTOM_CALENDAR_THEME_PRESET_ID,
  DEFAULT_CALENDAR_THEME,
  getCalendarThemePresetId,
  getCalendarThemePresetTheme,
  type CalendarTheme,
  type CalendarThemeKey,
} from "@/lib/calendar-theme";

type ThemeStatus = {
  type: "success" | "error";
  text: string;
} | null;

const THEME_PRESET_ICONS: Record<string, Icon> = {
  [CUSTOM_CALENDAR_THEME_PRESET_ID]: PaintBrush,
  afterglow: Sun,
  argonaut: RocketLaunch,
  "ayu-mirage": MoonStars,
  "catppuccin-macchiato": Cat,
  "catppuccin-mocha": Cat,
  chalk: ChalkboardSimple,
  dracula: MoonStars,
  "gruvbox-dark": Coffee,
  "gruvbox-light": Sun,
  material: PaintBrush,
  nord: Snowflake,
  "rose-pine": FlowerLotus,
  tokyonight: MoonStars,
  zenburn: Leaf,
};

interface ThemeSettingsPanelProps {
  theme: CalendarTheme;
  disabled?: boolean;
  saving?: boolean;
  status?: ThemeStatus;
  onChange: (theme: CalendarTheme) => void;
}

export default function ThemeSettingsPanel({
  theme,
  disabled,
  saving,
  status,
  onChange,
}: ThemeSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const detectedPresetId = getCalendarThemePresetId(theme);
  const [selectedPresetId, setSelectedPresetId] = useState(detectedPresetId);
  const customColorsVisible = selectedPresetId === CUSTOM_CALENDAR_THEME_PRESET_ID;

  useEffect(() => {
    setSelectedPresetId(detectedPresetId);
  }, [detectedPresetId]);

  function updateColor(key: CalendarThemeKey, color: string) {
    onChange({ ...theme, [key]: color });
  }

  function updatePreset(presetId: string) {
    setSelectedPresetId(presetId);
    if (presetId === CUSTOM_CALENDAR_THEME_PRESET_ID) return;

    const presetTheme = getCalendarThemePresetTheme(presetId);
    if (presetTheme) onChange(presetTheme);
  }

  function renderPresetLabel(presetId: string, label: string, color: string) {
    const Icon = THEME_PRESET_ICONS[presetId] ?? Sparkle;

    return (
      <span className="flex min-w-0 items-center gap-2">
        {presetId === "default" ? (
          <AppIconGlyph className="size-4 shrink-0" style={{ color }} />
        ) : (
          <Icon
            aria-hidden="true"
            className="size-4 shrink-0"
            style={{ color }}
            weight="duotone"
          />
        )}
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <Palette className="size-4" />
        <span className="hidden sm:inline">Цвета</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] rounded-md border bg-background p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Цветовая схема</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onChange(DEFAULT_CALENDAR_THEME)}
              disabled={disabled}
            >
              <RotateCcw className="size-4" />
              Сброс
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Пресет</div>
              <Select value={selectedPresetId} onValueChange={updatePreset} disabled={disabled}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите тему" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CUSTOM_CALENDAR_THEME_PRESET_ID}>
                    {renderPresetLabel(CUSTOM_CALENDAR_THEME_PRESET_ID, "Custom", theme.todayBorder)}
                  </SelectItem>
                  {CALENDAR_THEME_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {renderPresetLabel(preset.id, preset.label, preset.theme.todayBorder)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {customColorsVisible && CALENDAR_THEME_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{theme[field.key]}</span>
                    <input
                      type="color"
                      value={theme[field.key]}
                      disabled={disabled}
                      onChange={(event) => updateColor(field.key, event.target.value)}
                      className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Выбрать любой цвет для ${field.label}`}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CALENDAR_THEME_PALETTE.map((color) => {
                    const selected = theme[field.key].toLowerCase() === color;

                    return (
                      <button
                        key={`${field.key}-${color}`}
                        type="button"
                        aria-label={`${field.label}: ${color}`}
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => updateColor(field.key, color)}
                        className={[
                          "size-7 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border",
                          disabled ? "cursor-not-allowed opacity-60" : "hover:scale-110",
                        ].join(" ")}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 min-h-5 text-xs text-muted-foreground">
            {saving ? "Сохраняем..." : status ? (
              <span className={status.type === "success" ? "text-green-500" : "text-red-500"}>
                {status.text}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
