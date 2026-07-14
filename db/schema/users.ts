// db/schema/users.ts
import { pgTable, integer, text, date, boolean, varchar } from "drizzle-orm/pg-core";
import { DEFAULT_CALENDAR_THEME_TEXT } from "../../lib/calendar-theme";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nickname: text("nickname").unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  birthday: date("birthday"),
  isVerified: boolean("is_verified").notNull().default(false),
  timezone: text("timezone").notNull().default("Europe/Moscow"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  reminderDays: text("reminder_days").notNull().default("0,1,7"),
  reminderHour: integer("reminder_hour").notNull().default(6),
  calendarTheme: text("calendar_theme").notNull().default(DEFAULT_CALENDAR_THEME_TEXT),
});
