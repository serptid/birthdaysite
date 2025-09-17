import { date, integer, pgTable, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const peopleTable = pgTable("people", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
  .references(() => users.id,{onDelete: "cascade"})
  .notNull(),
  name: text("name"),
  date: date("date", { mode: "string" }), // "YYYY-MM-DD"
  note: text("note") 
  }
);
