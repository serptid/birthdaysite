import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
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
import { appIconSvg } from "@/components/AppIconGlyph";
import {
  CUSTOM_CALENDAR_THEME_PRESET_ID,
  getCalendarThemePresetId,
  normalizeCalendarTheme,
  type CalendarTheme,
} from "@/lib/calendar-theme";

const THEME_ICON_SELECTOR = 'link[data-bdsite-theme-icon="true"]';

const THEME_FAVICON_ICONS: Record<string, Icon> = {
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

function svgDataUrl(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function renderPresetIconSvg(presetId: string, color: string) {
  if (presetId === "default") return appIconSvg(color);

  const IconComponent = THEME_FAVICON_ICONS[presetId] ?? Sparkle;

  return renderToStaticMarkup(
    createElement(IconComponent, {
      color,
      size: 24,
      weight: "duotone",
    })
  );
}

export function updateThemeFavicon(theme: CalendarTheme) {
  if (typeof document === "undefined") return;

  const normalizedTheme = normalizeCalendarTheme(theme);
  const presetId = getCalendarThemePresetId(normalizedTheme);
  const svg = renderPresetIconSvg(presetId, normalizedTheme.todayBorder);
  const href = svgDataUrl(svg);
  const existing = document.head.querySelector<HTMLLinkElement>(THEME_ICON_SELECTOR);
  const link = existing ?? document.createElement("link");

  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  link.dataset.bdsiteThemeIcon = "true";

  if (!existing) document.head.appendChild(link);
}
