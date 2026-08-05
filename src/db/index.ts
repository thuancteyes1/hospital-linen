import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

export const getDbUrl = (): string | undefined => {
  return process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_PRIVATE_URL;
};

export const isDbConfigured = (): boolean => {
  const dbUrl = getDbUrl();
  if (dbUrl && (
    dbUrl.startsWith('postgres://') ||
    dbUrl.startsWith('postgresql://') ||
    dbUrl.includes('neon') ||
    dbUrl.includes('supabase')
  )) {
    return true;
  }
  if (process.env.SQL_HOST && process.env.SQL_USER) {
    return true;
  }
  return false;
};

// Function to create a new connection pool.
export const createPool = () => {
  const dbUrl = getDbUrl();
  const isPostgresUrl = dbUrl && (
    dbUrl.startsWith('postgres://') || 
    dbUrl.startsWith('postgresql://') || 
    dbUrl.includes('neon') || 
    dbUrl.includes('supabase')
  );

  if (isPostgresUrl) {
    return new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
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
export const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

let tablesInitPromise: Promise<void> | null = null;

export async function ensureTablesExist() {
  if (!isDbConfigured()) return;
  if (tablesInitPromise) return tablesInitPromise;

  tablesInitPromise = (async () => {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role INTEGER NOT NULL DEFAULT 2,
        dept TEXT NOT NULL DEFAULT 'NICU',
        status TEXT NOT NULL DEFAULT 'active',
        is_admin BOOLEAN NOT NULL DEFAULT false,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS linen_items (
        ma TEXT PRIMARY KEY,
        ten TEXT NOT NULL,
        nhom TEXT NOT NULL,
        kc INTEGER NOT NULL DEFAULT 0,
        mn INTEGER NOT NULL DEFAULT 20,
        hinh_anh TEXT,
        trang TEXT DEFAULT 'Trang 1',
        created_at TIMESTAMP DEFAULT NOW(),
        temp_clean INTEGER NOT NULL DEFAULT 0,
        temp_dirty INTEGER NOT NULL DEFAULT 0,
        temp_company_dirty INTEGER NOT NULL DEFAULT 0
      );`,
      `ALTER TABLE linen_items ADD COLUMN IF NOT EXISTS temp_clean INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE linen_items ADD COLUMN IF NOT EXISTS temp_dirty INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE linen_items ADD COLUMN IF NOT EXISTS temp_company_dirty INTEGER NOT NULL DEFAULT 0;`,
      `CREATE TABLE IF NOT EXISTS dept_allocations (
        id SERIAL PRIMARY KEY,
        item_ma TEXT NOT NULL REFERENCES linen_items(ma) ON DELETE CASCADE,
        dept TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS delivery_slips (
        id TEXT PRIMARY KEY,
        dept TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        original_slip_id TEXT,
        original_created_at TEXT,
        receiver TEXT,
        status TEXT NOT NULL,
        confirmed_at TEXT,
        confirmed_by TEXT,
        laundry_dispatch_id TEXT,
        laundry_received_by TEXT,
        laundry_received_at TEXT,
        laundry_returned_by TEXT,
        laundry_returned_at TEXT,
        hospital_clean_by TEXT,
        hospital_clean_at TEXT,
        verified_dirty_by TEXT,
        verified_dirty_at TEXT,
        is_guest_slip BOOLEAN NOT NULL DEFAULT false,
        is_rewash BOOLEAN NOT NULL DEFAULT false,
        attached_image TEXT,
        guest_name TEXT,
        guest_room TEXT,
        items TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS laundry_dispatches (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        original_dispatch_id TEXT,
        original_created_at TEXT,
        contractor TEXT NOT NULL,
        driver TEXT NOT NULL,
        plate TEXT NOT NULL,
        status TEXT NOT NULL,
        laundry_received_at TEXT,
        laundry_received_by TEXT,
        clean_returned_at TEXT,
        clean_returned_by TEXT,
        hospital_verified_at TEXT,
        hospital_verified_by TEXT,
        linked_slip_ids TEXT NOT NULL,
        is_guest_bill BOOLEAN NOT NULL DEFAULT false,
        attached_image TEXT,
        guest_name TEXT,
        guest_room TEXT,
        dept TEXT,
        items TEXT NOT NULL,
        loss_note TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        "user" TEXT NOT NULL,
        note TEXT NOT NULL,
        from_dept TEXT NOT NULL,
        to_dept TEXT NOT NULL,
        items TEXT NOT NULL,
        status TEXT NOT NULL,
        reject_reason TEXT,
        confirmed_by TEXT,
        confirmed_at TEXT,
        movement_applied BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT,
        creator_dept TEXT
      );`
    ];

    for (const q of queries) {
      try {
        await pool.query(q);
      } catch (err: any) {
        console.warn('Individual table init query warning/notice:', err?.message || err);
      }
    }
    console.log('PostgreSQL Neon tables ensured successfully.');
  })();

  return tablesInitPromise;
}

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });


