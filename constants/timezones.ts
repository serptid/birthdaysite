export type TimeZoneOption = {
  label: string;
  timeZone: string;
  offset: string;
};

export type TimeZoneGroup = {
  label: string;
  options: readonly TimeZoneOption[];
};

export const TIMEZONE_GROUPS: readonly TimeZoneGroup[] = [
  {
    label: "Россия",
    options: [
      { label: "Калининград", timeZone: "Europe/Kaliningrad", offset: "UTC+02" },
      { label: "Москва", timeZone: "Europe/Moscow", offset: "UTC+03" },
      { label: "Самара", timeZone: "Europe/Samara", offset: "UTC+04" },
      { label: "Урал", timeZone: "Asia/Yekaterinburg", offset: "UTC+05" },
      { label: "Омск", timeZone: "Asia/Omsk", offset: "UTC+06" },
      { label: "Сибирь", timeZone: "Asia/Novosibirsk", offset: "UTC+07" },
      { label: "Иркутск", timeZone: "Asia/Irkutsk", offset: "UTC+08" },
      { label: "Якутск", timeZone: "Asia/Yakutsk", offset: "UTC+09" },
      { label: "Владивосток", timeZone: "Asia/Vladivostok", offset: "UTC+10" },
      { label: "Магадан", timeZone: "Asia/Magadan", offset: "UTC+11" },
      { label: "Камчатка", timeZone: "Asia/Kamchatka", offset: "UTC+12" },
    ],
  },
  {
    label: "Европа / Африка",
    options: [
      { label: "Лондон", timeZone: "Europe/London", offset: "UTC+00" },
      { label: "Берлин / Париж", timeZone: "Europe/Berlin", offset: "UTC+01" },
      { label: "Киев / Афины", timeZone: "Europe/Kyiv", offset: "UTC+02" },
      { label: "Стамбул / Минск", timeZone: "Europe/Istanbul", offset: "UTC+03" },
      { label: "Дубай", timeZone: "Asia/Dubai", offset: "UTC+04" },
      { label: "Кейптаун", timeZone: "Africa/Johannesburg", offset: "UTC+02" },
    ],
  },
  {
    label: "Америка",
    options: [
      { label: "Гавайи", timeZone: "Pacific/Honolulu", offset: "UTC-10" },
      { label: "Аляска", timeZone: "America/Anchorage", offset: "UTC-09" },
      { label: "Лос-Анджелес", timeZone: "America/Los_Angeles", offset: "UTC-08" },
      { label: "Денвер", timeZone: "America/Denver", offset: "UTC-07" },
      { label: "Чикаго", timeZone: "America/Chicago", offset: "UTC-06" },
      { label: "Нью-Йорк", timeZone: "America/New_York", offset: "UTC-05" },
      { label: "Сантьяго", timeZone: "America/Santiago", offset: "UTC-04" },
      { label: "Буэнос-Айрес", timeZone: "America/Argentina/Buenos_Aires", offset: "UTC-03" },
    ],
  },
  {
    label: "Азия",
    options: [
      { label: "Иран", timeZone: "Asia/Tehran", offset: "UTC+03:30" },
      { label: "Афганистан", timeZone: "Asia/Kabul", offset: "UTC+04:30" },
      { label: "Ташкент", timeZone: "Asia/Tashkent", offset: "UTC+05" },
      { label: "Индия и Шри-Ланка", timeZone: "Asia/Kolkata", offset: "UTC+05:30" },
      { label: "Непал", timeZone: "Asia/Kathmandu", offset: "UTC+05:45" },
      { label: "Алматы", timeZone: "Asia/Almaty", offset: "UTC+06" },
      { label: "Мьянма", timeZone: "Asia/Yangon", offset: "UTC+06:30" },
      { label: "Бангкок", timeZone: "Asia/Bangkok", offset: "UTC+07" },
      { label: "Пекин / Сингапур", timeZone: "Asia/Shanghai", offset: "UTC+08" },
      { label: "Токио / Сеул", timeZone: "Asia/Tokyo", offset: "UTC+09" },
    ],
  },
  {
    label: "Океания",
    options: [
      { label: "Австралия, Центрально-Западный регион", timeZone: "Australia/Eucla", offset: "UTC+08:45" },
      { label: "Австралия, Центральный регион", timeZone: "Australia/Darwin", offset: "UTC+09:30" },
      { label: "Сидней", timeZone: "Australia/Sydney", offset: "UTC+10" },
      { label: "Австралия, Лорд-Хау", timeZone: "Australia/Lord_Howe", offset: "UTC+10:30" },
      { label: "Нумеа", timeZone: "Pacific/Noumea", offset: "UTC+11" },
      { label: "Окленд", timeZone: "Pacific/Auckland", offset: "UTC+12" },
      { label: "Новая Зеландия, Чатем", timeZone: "Pacific/Chatham", offset: "UTC+12:45" },
      { label: "Самоа", timeZone: "Pacific/Apia", offset: "UTC+13" },
      { label: "Кирибати", timeZone: "Pacific/Kiritimati", offset: "UTC+14" },
    ],
  },
] as const;

export const TIMEZONE_OPTIONS = TIMEZONE_GROUPS.flatMap((group) => group.options);

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

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
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

export function formatUtcOffset(timeZone: string, date = new Date()) {
  const minutes = offsetMinutes(timeZone, date);
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const restMinutes = absolute % 60;
  const minutePart = restMinutes ? `:${String(restMinutes).padStart(2, "0")}` : "";

  return `UTC${sign}${String(hours).padStart(2, "0")}${minutePart}`;
}

export function getTimeZoneOption(timeZone: string) {
  return TIMEZONE_OPTIONS.find((item) => item.timeZone === timeZone) ?? null;
}
