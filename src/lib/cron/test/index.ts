import cron from "node-cron";

declare global {
  var testCronStarted: boolean | undefined;
}

const SECRET_TOKEN = process.env.LINE_NOTIFY_SECRET!;

export function startCronTest() {
  if (!SECRET_TOKEN) {
    throw new Error("LINE_NOTIFY_SECRET is missing");
  }

  if (global.testCronStarted) {
    return;
  }

  global.testCronStarted = true;
 
  cron.schedule(
    "* * * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน อัตโนมัติทุกนาที");

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3300");

        const url = `${baseUrl}/api/secret-token`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "x-cron-token": SECRET_TOKEN,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        console.log("✅ ส่งรายงานสำเร็จ:", data.meta.count, "รายการ");
      } catch (error) {
        console.error("❌ ส่งรายงานล้มเหลว:", error);
      }
    },
    {
      timezone: "Asia/Bangkok",
    },
  );

  console.log("✅ Rent Ipt Test สำหรับส่ง LINE Notify ทุกนาที เริ่มทำงานแล้ว");
}
