// db/schema/users.ts
import { pgTable, serial, text, varchar, date, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  birthday: date("birthday"),
  isVerified: boolean("is_verified").notNull().default(false),
});
