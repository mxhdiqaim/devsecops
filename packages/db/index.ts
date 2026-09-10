import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://devsecops:devsecops@localhost:5432/devsecops";

const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });

export const rawClient = client;

export async function rawUnsafe(sql: string): Promise<any[]> {
  try {
    return await client.unsafe(sql);
  } catch {
    // @ts-ignore
    return await client(sql);
  }
}

export { desc, eq, count } from "drizzle-orm";
export * from "./schema";
