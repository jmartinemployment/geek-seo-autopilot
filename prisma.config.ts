import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "prisma/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually parse .env to handle special characters (e.g. & in passwords)
function loadEnv() {
  for (const envFile of [".env", ".env.local"]) {
    try {
      const content = readFileSync(resolve(__dirname, envFile), "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^([^#=][^=]*)=(.*)$/);
        if (!match) continue;
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {}
  }
}
loadEnv();

// Encode special chars in the password portion of the URL so Prisma's
// URL parser doesn't break on characters like & = @ etc.
function safeUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\/\/([^:]+):([^@]+)@/, (_: string, user: string, pass: string) =>
    `//${user}:${encodeURIComponent(decodeURIComponent(pass))}@`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: safeUrl(process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]),
  },
});
