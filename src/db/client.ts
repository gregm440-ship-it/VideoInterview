import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pg__: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });
}

function getDb() {
  if (!globalThis.__db__) {
    const client = globalThis.__pg__ ?? createClient();
    if (process.env.NODE_ENV !== "production") globalThis.__pg__ = client;
    globalThis.__db__ = drizzle(client, { schema });
  }
  return globalThis.__db__;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const target = getDb() as unknown as Record<string | symbol, unknown>;
    const value = target[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export { schema };
export type Database = ReturnType<typeof drizzle<typeof schema>>;
