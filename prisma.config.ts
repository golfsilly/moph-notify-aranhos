import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const environment =
  process.env.NODE_ENV === "production" ? "production" : "development";
loadEnv({ path: `.env.${environment}`, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The placeholder lets `prisma generate` run without a database. Commands
    // that connect must provide the dedicated localhost URL.
    url:
      process.env.DATABASE_URL ??
      "mysql://invalid:invalid@127.0.0.1:3306/moph_notify_aranhos",
  },
});
