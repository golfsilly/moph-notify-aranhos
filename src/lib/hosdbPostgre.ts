import { Pool, PoolConfig, QueryResultRow } from "pg";
import { ENV } from "@/config/env";

// ======================================================
// Pool Config
// ======================================================
const poolConfig: PoolConfig = {
  host: ENV.hosdb.hostSlave,
  user: ENV.hosdb.user,
  password: ENV.hosdb.pass,
  database: ENV.hosdb.name,
  port: Number(ENV.hosdb.port) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const hosPool = new Pool(poolConfig);

const HOS_ENABLED = Boolean(poolConfig.host?.length);

// ======================================================
// Heartbeat
// ======================================================
if (HOS_ENABLED) {
  setInterval(async () => {
    let conn = null;
    try {
      conn = await hosPool.connect();
      await conn.query("SELECT 1 AS heartbeat");
    } catch (error: unknown) {
      console.warn(
        "HOS DB heartbeat failed:",
        (error as unknown & { message?: string }).message ?? String(error),
      );
    } finally {
      conn?.release();
    }
  }, 25000);
} else {
  console.info("HOS DB heartbeat disabled");
}

// ======================================================
// Query function
// ======================================================
export async function queryHos<T = QueryResultRow[]>(
  sql: string,
  params: unknown[] = [],
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await hosPool.query(sql, params);
      return res.rows as T;
    } catch (error: unknown) {
      console.error(
        `HOS DB Query Error (attempt ${attempt + 1}):`,
        (error as unknown & { message?: string }).message ?? error,
      );

      const isNetworkError =
        (error as unknown & { code?: string }).code === "ECONNRESET" ||
        (error as unknown & { code?: string }).code === "ETIMEDOUT" ||
        (error as unknown & { message?: string }).message?.includes("timeout");

      if (isNetworkError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }

      throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก HOSxP");
    }
  }

  throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก HOSxP");
}
