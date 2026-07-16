export type CalendarTheme = {
  background: string;
  dayText: string;
  todayBorder: string;
  birthdayBackground: string;
  birthdayText: string;
};

export type CalendarThemeKey = keyof CalendarTheme;

const LEGACY_DEFAULT_DAY_TEXTS = ["#a1a1a1", "#a3a3a3"] as const;

export const DEFAULT_CALENDAR_THEME: CalendarTheme = {
  background: "#0a0a0a",
  dayText: "#f5f5f5",
  todayBorder: "#f5f5f5",
  birthdayBackground: "#00c950",
  birthdayText: "#0a0a0a",
};

export const DEFAULT_CALENDAR_THEME_TEXT = JSON.stringify(DEFAULT_CALENDAR_THEME);
export const CALENDAR_THEME_CACHE_KEY = "bdsite-calendar-theme";

export const CALENDAR_THEME_PALETTE = [
  "#0a0a0a",
  "#a1a1a1",
  "#a3a3a3",
  "#f5f5f5",
  "#ffffff",
  "#212121",
  "#282a36",
  "#1e1e2e",
  "#fbf1c7",
  "#eaeaea",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#84cc16",
  "#00c950",
  "#14b8a6",
  "#38bdf8",
  "#2563eb",
  "#8b5cf6",
  "#ec4899",
] as const;

export const CALENDAR_THEME_FIELDS: Array<{
  key: CalendarThemeKey;
  label: string;
}> = [
  {
    key: "background",
    label: "Фон страницы",
  },
  {
    key: "dayText",
    label: "Цифры дней",
  },
  {
    key: "todayBorder",
    label: "Сегодня",
  },
  {
    key: "birthdayBackground",
    label: "День рождения",
  },
  {
    key: "birthdayText",
    label: "Цифры ДР",
  },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const THEME_KEYS = CALENDAR_THEME_FIELDS.map((field) => field.key);

export const CUSTOM_CALENDAR_THEME_PRESET_ID = "custom";

export type CalendarThemePreset = {
  id: string;
  label: string;
  theme: CalendarTheme;
};

export const CALENDAR_THEME_PRESETS = [
  {
    id: "default",
    label: "Default",
    theme: DEFAULT_CALENDAR_THEME,
  },
  {
    id: "afterglow",
    label: "Afterglow",
    theme: {
      background: "#212121",
      dayText: "#d0d0d0",
      todayBorder: "#6c99bb",
      birthdayBackground: "#7e8e50",
      birthdayText: "#212121",
    },
  },
  {
    id: "argonaut",
    label: "Argonaut",
    theme: {
      background: "#0e1019",
      dayText: "#fffaf4",
      todayBorder: "#0092ff",
      birthdayBackground: "#abe15b",
      birthdayText: "#0e1019",
    },
  },
  {
    id: "ayu-mirage",
    label: "Ayu Mirage",
    theme: {
      background: "#1f2430",
      dayText: "#cccac2",
      todayBorder: "#73d0ff",
      birthdayBackground: "#d5ff80",
      birthdayText: "#1f2430",
    },
  },
  {
    id: "catppuccin-macchiato",
    label: "Catppuccin Macchiato",
    theme: {
      background: "#24273a",
      dayText: "#cad3f5",
      todayBorder: "#adc5f7",
      birthdayBackground: "#bde3b0",
      birthdayText: "#24273a",
    },
  },
  {
    id: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    theme: {
      background: "#1e1e2e",
      dayText: "#cdd6f4",
      todayBorder: "#aeccfc",
      birthdayBackground: "#c2ecbf",
      birthdayText: "#1e1e2e",
    },
  },
  {
    id: "chalk",
    label: "Chalk",
    theme: {
      background: "#2b2d2e",
      dayText: "#d2d8d9",
      todayBorder: "#4196ff",
      birthdayBackground: "#80c470",
      birthdayText: "#2b2d2e",
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    theme: {
      background: "#282a36",
      dayText: "#f8f8f2",
      todayBorder: "#d6acff",
      birthdayBackground: "#69ff94",
      birthdayText: "#282a36",
    },
  },
  {
    id: "gruvbox-dark",
    label: "Gruvbox Dark",
    theme: {
      background: "#0a0a0a",
      dayText: "#ebdbb2",
      todayBorder: "#83a598",
      birthdayBackground: "#b8bb26",
      birthdayText: "#282828",
    },
  },
  {
    id: "gruvbox-light",
    label: "Gruvbox Light",
    theme: {
      background: "#fbf1c7",
      dayText: "#3c3836",
      todayBorder: "#076678",
      birthdayBackground: "#79740e",
      birthdayText: "#fbf1c7",
    },
  },
  {
    id: "material",
    label: "Material",
    theme: {
      background: "#eaeaea",
      dayText: "#232322",
      todayBorder: "#54a4f3",
      birthdayBackground: "#7aba3a",
      birthdayText: "#eaeaea",
    },
  },
  {
    id: "nord",
    label: "Nord",
    theme: {
      background: "#2e3440",
      dayText: "#d8dee9",
      todayBorder: "#81a1c1",
      birthdayBackground: "#a3be8c",
      birthdayText: "#2e3440",
    },
  },
  {
    id: "rose-pine",
    label: "Rose Pine",
    theme: {
      background: "#191724",
      dayText: "#e0def4",
      todayBorder: "#9ccfd8",
      birthdayBackground: "#31748f",
      birthdayText: "#191724",
    },
  },
  {
    id: "tokyonight",
    label: "TokyoNight",
    theme: {
      background: "#1a1b26",
      dayText: "#c0caf5",
      todayBorder: "#7aa2f7",
      birthdayBackground: "#9ece6a",
      birthdayText: "#1a1b26",
    },
  },
  {
    id: "zenburn",
    label: "Zenburn",
    theme: {
      background: "#3f3f3f",
      dayText: "#dcdccc",
      todayBorder: "#94bff3",
      birthdayBackground: "#c3bf9f",
      birthdayText: "#3f3f3f",
    },
  },
] as const satisfies readonly CalendarThemePreset[];

function normalizeHexColor(value: string) {
  return value.toLowerCase();
}

function calendarThemesEqual(a: CalendarTheme, b: CalendarTheme) {
  return THEME_KEYS.every((key) => a[key] === b[key]);
}

function isLegacyDefaultTheme(theme: CalendarTheme) {
  return LEGACY_DEFAULT_DAY_TEXTS.some((dayText) =>
    calendarThemesEqual(theme, {
      ...DEFAULT_CALENDAR_THEME,
      dayText,
    })
  );
}

export function getCalendarThemePresetId(theme: CalendarTheme) {
  const normalizedTheme = normalizeCalendarTheme(theme);
  if (isLegacyDefaultTheme(normalizedTheme)) return "default";

  const preset = CALENDAR_THEME_PRESETS.find((item) => calendarThemesEqual(normalizedTheme, item.theme));

  return preset?.id ?? CUSTOM_CALENDAR_THEME_PRESET_ID;
}

export function getCalendarThemePresetTheme(id: string) {
  const preset = CALENDAR_THEME_PRESETS.find((item) => item.id === id);

  return preset ? { ...preset.theme } : null;
}

export function getCalendarThemeCssVariables(theme: CalendarTheme) {
  const normalizedTheme = normalizeCalendarTheme(theme);
  const subtleSurface = `color-mix(in srgb, ${normalizedTheme.background} 88%, ${normalizedTheme.dayText} 12%)`;
  const strongSurface = `color-mix(in srgb, ${normalizedTheme.background} 78%, ${normalizedTheme.dayText} 22%)`;
  const border = `color-mix(in srgb, ${normalizedTheme.background} 72%, ${normalizedTheme.dayText} 28%)`;
  const mutedForeground = `color-mix(in srgb, ${normalizedTheme.dayText} 72%, ${normalizedTheme.background} 28%)`;
  const accent = `color-mix(in srgb, ${normalizedTheme.background} 80%, ${normalizedTheme.birthdayBackground} 20%)`;

  return {
    "--background": normalizedTheme.background,
    "--foreground": normalizedTheme.dayText,
    "--card": subtleSurface,
    "--card-foreground": normalizedTheme.dayText,
    "--popover": subtleSurface,
    "--popover-foreground": normalizedTheme.dayText,
    "--primary": normalizedTheme.todayBorder,
    "--primary-foreground": normalizedTheme.background,
    "--secondary": strongSurface,
    "--secondary-foreground": normalizedTheme.dayText,
    "--muted": strongSurface,
    "--muted-foreground": mutedForeground,
    "--accent": accent,
    "--accent-foreground": normalizedTheme.dayText,
    "--border": border,
    "--input": border,
    "--ring": normalizedTheme.todayBorder,
  };
}

export function parseCalendarThemeInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Partial<Record<CalendarThemeKey, unknown>>;
  const theme: CalendarTheme = { ...DEFAULT_CALENDAR_THEME };

  for (const key of THEME_KEYS) {
    const nextValue = input[key];
    if (nextValue === undefined) continue;
    if (typeof nextValue !== "string" || !HEX_COLOR_RE.test(nextValue)) return null;
    theme[key] = normalizeHexColor(nextValue);
  }

  return isLegacyDefaultTheme(theme) ? DEFAULT_CALENDAR_THEME : theme;
}

export function normalizeCalendarTheme(value: unknown): CalendarTheme {
  return parseCalendarThemeInput(value) ?? DEFAULT_CALENDAR_THEME;
}

export function parseCalendarThemeText(value: string | null | undefined): CalendarTheme {
  if (!value) return DEFAULT_CALENDAR_THEME;

  try {
    return normalizeCalendarTheme(JSON.parse(value));
  } catch {
    return DEFAULT_CALENDAR_THEME;
  }
}

export function stringifyCalendarTheme(theme: CalendarTheme) {
  return JSON.stringify(normalizeCalendarTheme(theme));
}

export function getCalendarThemeBootstrapScript() {
  return `
(() => {
  try {
    const cacheKey = ${JSON.stringify(CALENDAR_THEME_CACHE_KEY)};
    const defaults = ${JSON.stringify(DEFAULT_CALENDAR_THEME)};
    const keys = ${JSON.stringify(THEME_KEYS)};
    const hexColorRe = /^#[0-9a-fA-F]{6}$/;
    const theme = { ...defaults };
    const raw = window.localStorage ? window.localStorage.getItem(cacheKey) : null;

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const key of keys) {
          const value = parsed[key];
          if (typeof value === "string" && hexColorRe.test(value)) {
            theme[key] = value.toLowerCase();
          }
        }
      }
    }

    const subtleSurface = "color-mix(in srgb, " + theme.background + " 88%, " + theme.dayText + " 12%)";
    const strongSurface = "color-mix(in srgb, " + theme.background + " 78%, " + theme.dayText + " 22%)";
    const border = "color-mix(in srgb, " + theme.background + " 72%, " + theme.dayText + " 28%)";
    const mutedForeground = "color-mix(in srgb, " + theme.dayText + " 72%, " + theme.background + " 28%)";
    const accent = "color-mix(in srgb, " + theme.background + " 80%, " + theme.birthdayBackground + " 20%)";
    const variables = {
      "--background": theme.background,
      "--foreground": theme.dayText,
      "--card": subtleSurface,
      "--card-foreground": theme.dayText,
      "--popover": subtleSurface,
      "--popover-foreground": theme.dayText,
      "--primary": theme.todayBorder,
      "--primary-foreground": theme.background,
      "--secondary": strongSurface,
      "--secondary-foreground": theme.dayText,
      "--muted": strongSurface,
      "--muted-foreground": mutedForeground,
      "--accent": accent,
      "--accent-foreground": theme.dayText,
      "--border": border,
      "--input": border,
      "--ring": theme.todayBorder,
    };

    for (const name in variables) {
      document.documentElement.style.setProperty(name, variables[name]);
    }
  } catch {}
})();
`;
}
