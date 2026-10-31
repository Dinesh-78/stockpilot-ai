import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let dbUrl = 'file:./dev.db';

// On Vercel serverless functions, SQLite database must reside in /tmp for write access
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const sourceDb = path.join(process.cwd(), 'prisma', 'dev.db');
    if (fs.existsSync(sourceDb)) {
      try {
        fs.copyFileSync(sourceDb, tmpDbPath);
      } catch (e) {
        console.warn('Could not copy sqlite db to /tmp:', e);
      }
    }
  }
  dbUrl = 'file:/tmp/dev.db';
} else if (process.env.DATABASE_URL) {
  dbUrl = process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

