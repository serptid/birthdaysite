import { date, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nickname: text("nickname").unique().notNull(),
  email: varchar("email",{ length: 255 }).notNull().unique(),
  birthday: date("birthday"), //Нужно будет добавить проверку на дату
});
