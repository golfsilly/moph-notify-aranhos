import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

const environment =
  process.env.NODE_ENV === "production" ? "production" : "development";
loadEnv({ path: `.env.${environment}`, quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const url = new URL(connectionString);
const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const databaseName = url.pathname.replace(/^\//, "");

if (!allowedHosts.has(url.hostname)) {
  throw new Error("The notification database URL must point to localhost");
}

if ((url.port || "3306") !== "3306") {
  throw new Error("The notification database URL must use port 3306");
}

if (databaseName !== "moph_notify_aranhos") {
  throw new Error(
    "The notification database URL must use database moph_notify_aranhos",
  );
}

async function main(): Promise<void> {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    connectTimeout: 10_000,
  });

  try {
    await connection.query(
      "CREATE DATABASE IF NOT EXISTS moph_notify_aranhos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    console.log(
      "Database moph_notify_aranhos is ready on localhost:3306 (utf8mb4)",
    );
  } finally {
    await connection.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
