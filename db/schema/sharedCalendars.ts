import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const sharedCalendars = pgTable("shared_calendars", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  slugUnique: uniqueIndex("shared_calendars_slug_unique").on(t.slug),
}));

export const sharedCalendarMembers = pgTable("shared_calendar_members", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id")
    .notNull()
    .references(() => sharedCalendars.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Europe/Moscow"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  reminderDays: text("reminder_days").notNull().default("0,1,7"),
  reminderHour: integer("reminder_hour").notNull().default(6),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => ({
  memberUnique: uniqueIndex("shared_calendar_members_calendar_user_unique").on(t.calendarId, t.userId),
}));

export const sharedCalendarBirthdays = pgTable("shared_calendar_birthdays", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id")
    .notNull()
    .references(() => sharedCalendars.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: date("date", { mode: "string" }),
  birthMonth: integer("birth_month").notNull(),
  birthDay: integer("birth_day").notNull(),
  birthYear: integer("birth_year"),
  note: text("note"),
  editedByUserId: integer("edited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  birthdayUnique: uniqueIndex("shared_calendar_birthdays_calendar_user_unique").on(t.calendarId, t.userId),
}));

export const sharedNotificationLogs = pgTable("shared_notification_logs", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id").notNull(),
  userId: integer("user_id").notNull(),
  birthdayId: integer("birthday_id").notNull(),
  kind: text("kind").notNull(),
  runDate: date("run_date").notNull(),
}, (t) => ({
  sharedNotifUnique: uniqueIndex("shared_notif_uniq").on(
    t.calendarId,
    t.userId,
    t.birthdayId,
    t.kind,
    t.runDate
  ),
}));
