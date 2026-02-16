import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export const db = drizzle(pool, { schema });
