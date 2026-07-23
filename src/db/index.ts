import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

// Function to create a new connection pool.
export const createPool = () => {
  const dbUrl = process.env.DATABASE_URL;
  const isPostgresUrl = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));
  if (isPostgresUrl) {
    return new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 15000,
      ssl: dbUrl.includes('supabase') || dbUrl.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
