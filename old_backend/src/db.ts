import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { seedDummyData } from './seed';

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'portal.db');

const adapter = new PrismaBetterSqlite3({ url: dbPath });

export const prisma = new PrismaClient({ adapter });

export async function checkAndSeed(): Promise<void> {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      console.log("Empty SQLite database detected. Auto-seeding mock records...");
      await seedDummyData();
    }
  } catch (err) {
    console.error("Error checking database state, trying to seed...", err);
    try {
      await seedDummyData();
    } catch (seedErr) {
      console.error("Database auto-seeding failed:", seedErr);
    }
  }
}
