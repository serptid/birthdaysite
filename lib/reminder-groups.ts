import { addDaysUTC, mmdd, parseISO, pad2 } from "@/lib/when";

export type ReminderBirthday = {
  id?: number;
  name: string | null;
  date: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  note: string | null;
};

export type ReminderCurrentDate = {
  y: number;
  m: number;
  d: number;
};

export type ReminderEmailItem = {
  name: string;
  date: string;
  birthYear: number | null;
  targetYear: number;
  note: string | null;
};

export type ReminderEmailGroup<TPerson extends ReminderBirthday = ReminderBirthday> = {
  day: number;
  key: string;
  label: string;
  target: ReminderCurrentDate;
  people: TPerson[];
  items: ReminderEmailItem[];
};

export const ACCOUNT_REMINDER_DAYS = [0, 1, 3, 7] as const;
export const SHARED_REMINDER_DAYS = [0, 1, 7] as const;

export function parseReminderDays(
  value: string,
  allowedDays: readonly number[] = ACCOUNT_REMINDER_DAYS
) {
  const allowed = new Set(allowedDays);
  const days = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => allowed.has(item));

  return [...new Set(days)].sort((a, b) => a - b);
}

export function reminderLabel(day: number) {
  if (day === 0) return "Сегодня";
  if (day === 1) return "Завтра";
  if (day === 7) return "Через неделю";
  return `Через ${day} дн.`;
}

function leap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function birthdayMMDD(person: ReminderBirthday, targetYear: number) {
  let month = person.birthMonth;
  let day = person.birthDay;

  if ((!month || !day) && person.date) {
    const parsed = parseISO(person.date);
    month = parsed.m;
    day = parsed.d;
  }

  if (!month || !day) return null;
  if (month === 2 && day === 29 && !leap(targetYear)) day = 28;

  return `${pad2(month)}-${pad2(day)}`;
}

function toEmailItems<TPerson extends ReminderBirthday>(people: TPerson[], targetYear: number) {
  return people
    .filter((person) => person.name && (person.date || (person.birthMonth && person.birthDay)))
    .map((person) => ({
      name: person.name as string,
      date: person.date ?? `${person.birthYear ?? targetYear}-${pad2(person.birthMonth!)}-${pad2(person.birthDay!)}`,
      birthYear: person.birthYear ?? null,
      targetYear,
      note: person.note ?? null,
    }));
}

export function buildReminderEmailGroups<TPerson extends ReminderBirthday>(
  people: TPerson[],
  reminderDays: number[],
  currentDate: ReminderCurrentDate,
  labelForDay: (day: number) => string = reminderLabel
): ReminderEmailGroup<TPerson>[] {
  return reminderDays.map((day) => {
    const target = addDaysUTC(currentDate.y, currentDate.m, currentDate.d, day);
    const targetMMDD = mmdd(target.y, target.m, target.d);
    const matches = people.filter((person) => birthdayMMDD(person, target.y) === targetMMDD);

    return {
      day,
      key: `D${day}`,
      label: labelForDay(day),
      target,
      people: matches,
      items: toEmailItems(matches, target.y),
    };
  });
}

export function hasReminderEmailItems(groups: ReminderEmailGroup[]) {
  return groups.some((group) => group.items.length > 0);
}

export function buildEmptyReminderTestGroups(
  label: string,
  currentDate: ReminderCurrentDate
) {
  const today = `${currentDate.y}-${pad2(currentDate.m)}-${pad2(currentDate.d)}`;

  return [
    {
      key: "TEST_EMPTY",
      label,
      items: [
        {
          name: "Дней рождений не назначено",
          date: today,
          birthYear: null,
          targetYear: currentDate.y,
          note: "Это тестовое письмо. На сегодня, завтра и через неделю дней рождений нет.",
        },
      ],
    },
  ];
}
