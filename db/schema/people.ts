import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const peopleTable = pgTable("people", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
  .references(() => usersTable.id,{onDelete: "cascade"})
  .notNull(),
  name: text("name"),
  date: date("date"),
  note: text("note") 
  }
);
