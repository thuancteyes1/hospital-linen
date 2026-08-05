import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

export const isDbConfigured = (): boolean => {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || dbUrl.includes('neon') || dbUrl.includes('supabase'))) {
    return true;
  }
  if (process.env.SQL_HOST && process.env.SQL_USER) {
    return true;
  }
  return false;
};

// Function to create a new connection pool.
export const createPool = () => {
  const dbUrl = process.env.DATABASE_URL;
  const isPostgresUrl = dbUrl && (
    dbUrl.startsWith('postgres://') || 
    dbUrl.startsWith('postgresql://') || 
    dbUrl.includes('neon') || 
    dbUrl.includes('supabase')
  );

  if (isPostgresUrl) {
    return new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
  }
  if (process.env.SQL_HOST && process.env.SQL_USER) {
    return new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis: 5000,
    });
  }
  // Return dummy pool configuration when DB is not configured to avoid hanging timeouts
  return new Pool({
    host: '127.0.0.1',
    port: 54321, // Unreachable port to fail immediately if mistakenly invoked
    connectionTimeoutMillis: 1000,
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

