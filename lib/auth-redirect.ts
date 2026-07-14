export function normalizeAuthRedirect(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.length > 200) {
    return "/";
  }

  return trimmed;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function originFromAppUrl() {
  if (!process.env.APP_URL) return null;

  try {
    return new URL(process.env.APP_URL).origin;
  } catch {
    return null;
  }
}

function allowedHosts() {
  const hosts = new Set([
    "bdsite.ru",
    "www.bdsite.ru",
    "bdsite.vercel.app",
    "localhost:3000",
    "127.0.0.1:3000",
  ]);

  const appOrigin = originFromAppUrl();
  if (appOrigin) hosts.add(new URL(appOrigin).host.toLowerCase());

  return hosts;
}

export function requestOrigin(req: Request) {
  const requestUrl = new URL(req.url);
  const fallbackOrigin = originFromAppUrl() ?? requestUrl.origin;
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  const host = (forwardedHost ?? req.headers.get("host") ?? requestUrl.host).toLowerCase();

  if (!allowedHosts().has(host)) return fallbackOrigin;

  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const proto = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestUrl.protocol.replace(":", "");

  return `${proto}://${host}`;
}

export function authTokenUrl(req: Request, path: string, token: string, redirectTo?: string | null) {
  const url = new URL(path, requestOrigin(req));
  url.searchParams.set("token", token);

  if (redirectTo !== undefined) {
    url.searchParams.set("next", normalizeAuthRedirect(redirectTo));
  }

  return url.toString();
}

export function authRedirectUrl(baseUrl: string, statusKey: string, statusValue: string, redirectTo: string | null | undefined) {
  const url = new URL(normalizeAuthRedirect(redirectTo), baseUrl);
  url.searchParams.set(statusKey, statusValue);
  return url;
}
