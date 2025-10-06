// db/schema/users.ts
import { pgTable, integer, text, date, boolean, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nickname: text("nickname").unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  birthday: date("birthday"),
  isVerified: boolean("is_verified").notNull().default(false),
  timezone: text("timezone").notNull().default("Europe/Moscow"), // NEW
});
