import { normalizeCalendarTheme, type CalendarTheme } from "@/lib/calendar-theme";

const THEME_ICON_SELECTOR = 'link[data-bdsite-theme-icon="true"]';

function svgDataUrl(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function updateThemeFavicon(theme: CalendarTheme) {
  if (typeof document === "undefined") return;

  const normalizedTheme = normalizeCalendarTheme(theme);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="${normalizedTheme.background}"/>
  <circle cx="32" cy="29" r="20" fill="${normalizedTheme.background}" stroke="${normalizedTheme.todayBorder}" stroke-width="4"/>
  <g transform="translate(14 9) scale(1.5)" stroke="${normalizedTheme.dayText}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 16v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v1"/>
    <path d="M12 6a2 2 0 0 1 2 2"/>
    <path d="M18 8c0 4-3.5 8-6 8s-6-4-6-8a6 6 0 0 1 12 0"/>
  </g>
  <circle cx="47" cy="17" r="6" fill="${normalizedTheme.birthdayBackground}"/>
</svg>`.trim();

  const href = svgDataUrl(svg);
  const existing = document.head.querySelector<HTMLLinkElement>(THEME_ICON_SELECTOR);
  const link = existing ?? document.createElement("link");

  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  link.dataset.bdsiteThemeIcon = "true";

  if (!existing) document.head.appendChild(link);
}
