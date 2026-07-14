export function normalizeAuthRedirect(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.length > 200) {
    return "/";
  }

  return trimmed;
}

export function authRedirectUrl(baseUrl: string, statusKey: string, statusValue: string, redirectTo: string | null | undefined) {
  const url = new URL(normalizeAuthRedirect(redirectTo), baseUrl);
  url.searchParams.set(statusKey, statusValue);
  return url;
}
