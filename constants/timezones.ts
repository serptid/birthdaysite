export const RUSSIAN_TIMEZONES = [
  { city: "Калининград", timeZone: "Europe/Kaliningrad" },
  { city: "Москва", timeZone: "Europe/Moscow" },
  { city: "Самара", timeZone: "Europe/Samara" },
  { city: "Екатеринбург", timeZone: "Asia/Yekaterinburg" },
  { city: "Омск", timeZone: "Asia/Omsk" },
  { city: "Новосибирск", timeZone: "Asia/Novosibirsk" },
  { city: "Красноярск", timeZone: "Asia/Krasnoyarsk" },
  { city: "Иркутск", timeZone: "Asia/Irkutsk" },
  { city: "Якутск", timeZone: "Asia/Yakutsk" },
  { city: "Владивосток", timeZone: "Asia/Vladivostok" },
  { city: "Магадан", timeZone: "Asia/Magadan" },
  { city: "Южно-Сахалинск", timeZone: "Asia/Sakhalin" },
  { city: "Петропавловск-Камчатский", timeZone: "Asia/Kamchatka" },
  { city: "Анадырь", timeZone: "Asia/Anadyr" },
] as const;

function partsInTimeZone(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour) === 24 ? 0 : Number(values.hour);

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function offsetMinutes(timeZone: string, date: Date) {
  const parts = partsInTimeZone(timeZone, date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return Math.round((asUtc - date.getTime()) / 60000);
}

export function formatMoscowOffset(timeZone: string, date = new Date()) {
  const diffHours = (offsetMinutes(timeZone, date) - offsetMinutes("Europe/Moscow", date)) / 60;

  if (diffHours === 0) return "0";
  return diffHours > 0 ? `+${diffHours}` : String(diffHours);
}

export function formatRussianTimeZoneLabel(city: string, timeZone: string, date = new Date()) {
  return `${city} - ${formatMoscowOffset(timeZone, date)}`;
}
