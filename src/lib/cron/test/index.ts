import { ENV } from "@/config/env";
import cron from "node-cron";

declare global {
  var testCronStarted: boolean | undefined;
}

const SECRET_TOKEN = ENV.cronToken;

export function startCronTest() {
  if (!SECRET_TOKEN) {
    throw new Error("CRON_SECRET_TOKEN is missing");
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
          ENV.appUrl || "http://localhost:50000";

        // const url = `${baseUrl}/api/secret-token`;
        const url = `${baseUrl}/api/rent-ipt-alert/rent-ipt-intern`;

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
