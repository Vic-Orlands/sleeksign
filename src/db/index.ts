import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const databaseFetchTimeoutMs = Number(
  process.env.DATABASE_FETCH_TIMEOUT_MS || 25_000,
);

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), databaseFetchTimeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

neonConfig.fetchFunction = fetchWithTimeout;

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
