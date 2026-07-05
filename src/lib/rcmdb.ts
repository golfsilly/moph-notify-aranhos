import mysql, {
  Pool,
  PoolOptions,
  RowDataPacket,
  PoolConnection,
  QueryError,
} from "mysql2/promise";

import { ENV } from "@/config/env";

// ======================================================
// Pool Config
// ======================================================
const poolConfig: PoolOptions = {
  host: ENV.rcmdb.host,
  user: ENV.rcmdb.user,
  password: ENV.rcmdb.pass,
  database: ENV.rcmdb.name,
  port: ENV.rcmdb.port,

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 30000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  charset: "tis620",
};

const rcmPool: Pool = mysql.createPool(poolConfig);

const RCM_ENABLED = Boolean(poolConfig.host?.length);

// ======================================================
// Heartbeat
// ======================================================
if (RCM_ENABLED) {
  setInterval(async () => {
    let conn: PoolConnection | null = null;

    try {
      conn = await rcmPool.getConnection();
      await conn.query("SELECT 1 AS heartbeat");
    } catch (error: unknown) {
      const err = error as QueryError;

      console.warn("rcmdb heartbeat failed:", err.message ?? String(error));
    } finally {
      conn?.release();
    }
  }, 25000);
} else {
  console.info("rcmdb heartbeat disabled");
}

// ======================================================
// Query Function
// ======================================================
export async function queryRcm<T = RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [rows] = await rcmPool.query(sql, params);
      return rows as T;
    } catch (error: unknown) {
      const err = error as QueryError;

      console.error(
        `RCM DB Query Error (attempt ${attempt + 1}):`,
        err.message ?? err,
      );

      if (
        (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") &&
        attempt < retries
      ) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }

      throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก rcmdb");
    }
  }

  throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก rcmdb");
}
