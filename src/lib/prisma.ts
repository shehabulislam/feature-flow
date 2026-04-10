import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "";

  if (url.startsWith("file:") || url.endsWith(".db")) {
    // SQLite — local development / self-hosted (zero setup)
    const dbPath = url.startsWith("file:")
      ? path.join(process.cwd(), url.replace("file:", "").replace("./", ""))
      : path.join(process.cwd(), url);
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({ adapter });
  }

  // PostgreSQL — production (Vercel, Fly.io, Docker)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require(/* webpackIgnore: true */ "@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require(/* webpackIgnore: true */ "pg");

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
