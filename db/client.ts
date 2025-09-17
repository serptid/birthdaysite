// src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema"; // импортируешь index.ts, где re-export всех таблиц

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl: true, // <— важно для Neon

});

export const db = drizzle(pool, { schema }); // теперь db.query.<table> будет работать
