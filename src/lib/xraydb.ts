import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma";
import { XrayNotificationLogData } from "@/types/xray-portable.type";

// ======================================================
// Prisma Client - Local Database for Notification Logs
// ======================================================
//
// Prisma 6.6+/7 เลิกใช้ query engine แบบเดิม และ "บังคับ" ให้ PrismaClient
// ต้องได้รับ driver adapter เสมอ (new PrismaClient() เฉยๆ จะ throw error)
// สำหรับ MySQL/MariaDB ใช้ @prisma/adapter-mariadb ซึ่งครอบ driver `mariadb`
// อีกที (ไม่ใช่ mysql2) — ต้อง npm install @prisma/adapter-mariadb mariadb
//
// ตั้งค่าใน .env:
//   NOTIFY_DATABASE_URL="mysql://user:password@localhost:3306/moph_notify_aranhos"
// (ตัวแปรเดียวกับที่ schema.prisma ใช้อ้างอิงใน datasource db { url = env("...") }
//  เพื่อให้ `prisma migrate`/`prisma studio` ยังต่อฐานข้อมูลได้ปกติ
//  ส่วน adapter ด้านล่างจะ parse URL เดียวกันนี้มาใช้ตอน runtime)

function parseConnectionString(connectionString: string) {
  const url = new URL(connectionString);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

declare global {
  // ป้องกันสร้าง PrismaClient ซ้ำตอน hot-reload ใน dev mode (Next.js)
  var __notifyPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "❌ NOTIFY_DATABASE_URL is not set. Please add it to your .env file, " +
        'e.g. NOTIFY_DATABASE_URL="mysql://user:password@localhost:3306/moph_notify_aranhos"',
    );
  }

  const adapter = new PrismaMariaDb({
    ...parseConnectionString(connectionString),
    connectionLimit: 5,
  });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

const prisma = global.__notifyPrisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__notifyPrisma = prisma;
}

// ======================================================
// Query Functions
// ======================================================

/**
 * Check if a notify_key already exists in the notification log
 */
export async function checkNotificationExists(
  notify_key: string,
): Promise<boolean> {
  try {
    const record = await prisma.xrayNotificationLog.findUnique({
      where: { notify_key },
      select: { id: true },
    });

    return record !== null;
  } catch (error) {
    console.error("❌ Error checking notification exists:", error);
    throw error;
  }
}

/**
 * Check which notify_keys already exist in the database
 */
export async function checkExistingNotifications(
  notify_keys: string[],
): Promise<string[]> {
  if (notify_keys.length === 0) {
    return [];
  }

  try {
    const records = await prisma.xrayNotificationLog.findMany({
      where: { notify_key: { in: notify_keys } },
      select: { notify_key: true },
    });

    return records.map((r) => r.notify_key);
  } catch (error) {
    console.error("❌ Error checking existing notifications:", error);
    throw error;
  }
}

/**
 * Insert a new notification log record
 */
export async function createNotificationLog(data: XrayNotificationLogData) {
  try {
    return await prisma.xrayNotificationLog.create({
      data: {
        notify_key: data.notify_key,
        xn: data.xn,
        vn: data.vn,
        hn: data.hn,
        age: data.age ?? null,
        department: data.department ?? null,
        xray_list: data.xray_list ?? null,
        order_date: data.order_date,
      },
    });
  } catch (error) {
    console.error("❌ Error creating notification log:", error);
    throw error;
  }
}

/**
 * Batch insert multiple notification logs
 * ใช้ upsert ทีละรายการ (แทน createMany) เพื่อคงพฤติกรรมเดิม:
 * ถ้า notify_key ซ้ำ ให้แค่ touch updatedAt แทนที่จะ error ทั้ง batch
 */
export async function createNotificationLogBatch(
  dataArray: XrayNotificationLogData[],
): Promise<number> {
  if (dataArray.length === 0) {
    return 0;
  }

  let insertedCount = 0;

  for (const data of dataArray) {
    try {
      await prisma.xrayNotificationLog.upsert({
        where: { notify_key: data.notify_key },
        create: {
          notify_key: data.notify_key,
          xn: data.xn,
          vn: data.vn,
          hn: data.hn,
          age: data.age ?? null,
          department: data.department ?? null,
          xray_list: data.xray_list ?? null,
          order_date: data.order_date,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      insertedCount++;
    } catch (error) {
      console.warn(
        `⚠️ Failed to insert notification log for notify_key ${data.notify_key}:`,
        error,
      );
      // Continue with next record instead of failing entire batch
    }
  }

  return insertedCount;
}

/**
 * Get all notification logs (for debugging/analytics)
 */
export async function getNotificationLogs(limit: number = 100) {
  try {
    return await prisma.xrayNotificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("❌ Error getting notification logs:", error);
    throw error;
  }
}

/**
 * Delete old notification logs (for data retention)
 */
export async function deleteOldNotificationLogs(
  daysOld: number = 30,
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.xrayNotificationLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return result.count;
  } catch (error) {
    console.error("❌ Error deleting old notification logs:", error);
    throw error;
  }
}
