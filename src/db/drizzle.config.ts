import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const rawConnectionString = process.env.DATABASE_URL;
const connectionString = rawConnectionString && (rawConnectionString.startsWith('postgres://') || rawConnectionString.startsWith('postgresql://')) ? rawConnectionString : undefined;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!connectionString && (!sqlHost || !sqlDbName || !user || !password)) {
  throw new Error("Either DATABASE_URL or (SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD) must be set in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionString ? {
    url: connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : undefined,
  } : {
    host: sqlHost!,
    user: user!,
    password: password!,
    database: sqlDbName!,
    ssl: false,
  },
  verbose: true,
});
