import type { CSSProperties } from "react";

type AppIconGlyphProps = {
  className?: string;
  style?: CSSProperties;
  color?: string;
};

export const APP_ICON_PATHS = [
  "M12 16v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v1",
  "M12 6a2 2 0 0 1 2 2",
  "M18 8c0 4-3.5 8-6 8s-6-4-6-8a6 6 0 0 1 12 0",
] as const;

export function AppIconGlyph({ className, style, color = "currentColor" }: AppIconGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {APP_ICON_PATHS.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function appIconSvg(color: string) {
  const paths = APP_ICON_PATHS.map((path) => `<path d="${path}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
