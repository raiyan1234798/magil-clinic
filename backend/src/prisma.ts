import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl?.startsWith('file:')) return envUrl.slice(5);
  if (envUrl) return envUrl;
  return path.join(__dirname, '..', 'dev.db');
}

export const dbPath = resolveDatabaseUrl();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const adapter = new PrismaBetterSqlite3({ url: dbPath });
export const prisma = new PrismaClient({ adapter });
