// db/schema/notificationLogs.ts
import { pgTable, serial, integer, text, date, uniqueIndex } from "drizzle-orm/pg-core";

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  personId: integer("person_id").notNull(),
  kind: text("kind").notNull(),         // 'D7' | 'D1' | 'D0'
  runDate: date("run_date").notNull(),  // дата рассылки в TZ пользователя
}, (t) => ({
  uniq: uniqueIndex("notif_uniq").on(t.userId, t.personId, t.kind, t.runDate),
}));
