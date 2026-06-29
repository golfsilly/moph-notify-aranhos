import { ENV } from './../config/env';
import mysql, { Pool, PoolOptions, RowDataPacket } from "mysql2/promise";

const poolConfig: PoolOptions = {
  host: ENV.db.host || "",

  user: ENV.db.user || "",

  password: ENV.db.pass || "",

  database: ENV.db.name || "",

  port: Number(ENV.db.port) || 3306,

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

const hosPool: Pool = mysql.createPool(poolConfig);

const HOS_ENABLED = Boolean(poolConfig.host && poolConfig.host.length > 0);

if (HOS_ENABLED) {
  setInterval(async () => {
    let conn: any | null = null;

    try {
      conn = await hosPool.getConnection();

      await conn.query("SELECT 1 AS heartbeat");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      console.warn("HOS DB heartbeat failed:", msg);
    } finally {
      try {
        conn?.release();
      } catch {}
    }
  }, 25000);
} else {
  console.info("HOS DB heartbeat disabled");
}

export async function queryHos<T = RowDataPacket[]>(
  sql: string,
  params: any[] = [],
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [rows] = await hosPool.query(sql, params);

      return rows as T;
    } catch (error: any) {
      console.error(
        `Database Query Error (attempt ${attempt + 1}):`,

        error,
      );

      if (
        (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") &&
        attempt < retries
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * (attempt + 1)),
        );

        continue;
      }

      throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก HOSxP");
    }
  }

  throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก HOSxP");
}
