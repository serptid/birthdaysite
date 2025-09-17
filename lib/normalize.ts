// lib/normalize.ts
export function normalizeNickname(s: string) {
  return s.trim().toLocaleUpperCase("ru-RU"); // единый формат
}
