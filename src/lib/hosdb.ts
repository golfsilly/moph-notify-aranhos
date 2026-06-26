// src/lib/hosdb.ts
import mysql, { Pool, PoolOptions, RowDataPacket } from "mysql2/promise";

const poolConfig: PoolOptions = {
  host: process.env.HOS_DB_HOST || "",
  user: process.env.HOS_DB_USER || "",
  password: process.env.HOS_DB_PASS || "",
  database: process.env.HOS_DB_NAME || "",
  port: Number(process.env.HOS_DB_PORT) || 3306,

  // Pool options
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // สำคัญ
  idleTimeout: 30000, // 30 วินาที (สำคัญมากสำหรับ ECONNRESET)
  queueLimit: 0,

  // Keep-alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,

  // Connection options (mysql2 รองรับ)
  connectTimeout: 10000,
  charset: 'utf8mb4',
};

const hosPool: Pool = mysql.createPool(poolConfig);

// ป้องกัน idle connection ถูกปิดโดย MySQL Server
// ใช้ getConnection/release และ log แบบสั้นเพื่อหลีกเลี่ยง stack spam
const HOS_ENABLED = Boolean(poolConfig.host && poolConfig.host.length > 0);

if (HOS_ENABLED) {
  setInterval(async () => {
    let conn: any | null = null;
    try {
      conn = await hosPool.getConnection();
      // ใช้ query แล้ว release เพื่อให้แน่ใจว่า connection ถูกคืนกลับไปยัง pool
      await conn.query("SELECT 1 AS heartbeat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("HOS DB heartbeat failed:", msg);
    } finally {
      try {
        conn?.release();
      } catch (e) {
        // ignore
      }
    }
  }, 25000);
} else {
  // ถ้าไม่มีการตั้งค่า host ให้ข้าม heartbeat
  console.info("HOS DB heartbeat disabled (no HOS_DB_HOST configured)");
}

export async function queryHos<T extends RowDataPacket[]>(
  sql: string,
  params: any[] = [],
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // const [rows] = await hosPool.execute<T>(sql, params);
      const [rows] = await hosPool.query<T>(sql, params);
      return rows;
    } catch (error: any) {
      console.error(`Database Query Error (attempt ${attempt + 1}):`, error);

      if (
        (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") &&
        attempt < retries
      ) {
        console.log(
          `🔄 Retrying query (attempt ${attempt + 1}/${retries + 1})...`,
        );
        // รอสั้นๆ ก่อน retry
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
