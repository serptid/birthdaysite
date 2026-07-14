// src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

type GlobalWithPgPool = typeof globalThis & {
  __birthdaysitePgPool?: Pool;
  __birthdaysitePgPoolErrorHandlerAttached?: boolean;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const usesLocalDatabase = /(?:localhost|127\.0\.0\.1)/i.test(connectionString);
const sslDisabled = /[?&]sslmode=disable(?:&|$)/i.test(connectionString);

const poolConfig: PoolConfig = {
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: usesLocalDatabase || sslDisabled ? false : { rejectUnauthorized: false },
};

const globalForPg = globalThis as GlobalWithPgPool;
const pool = globalForPg.__birthdaysitePgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPg.__birthdaysitePgPool = pool;
}

if (!globalForPg.__birthdaysitePgPoolErrorHandlerAttached) {
  pool.on("error", (error) => {
    console.error("Postgres idle client error:", error);
  });
  globalForPg.__birthdaysitePgPoolErrorHandlerAttached = true;
}

export const db = drizzle(pool, { schema });
