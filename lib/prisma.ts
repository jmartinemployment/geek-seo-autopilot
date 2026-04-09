import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Encode special characters in the password portion so pg can parse the URL
function safeConnectionString(url: string): string {
  return url.replace(
    /\/\/([^:]+):([^@]+)@/,
    (_: string, user: string, pass: string) =>
      `//${user}:${encodeURIComponent(decodeURIComponent(pass))}@`
  );
}

const connectionString = safeConnectionString(
  process.env.DATABASE_URL ?? ""
);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
