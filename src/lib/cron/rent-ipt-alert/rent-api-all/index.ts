import cron from "node-cron";
import { ENV } from "@/config/env";

declare global {
  var rentIptAllCronStarted: boolean | undefined;
}

const TOKEN = ENV.cronToken;
const SECRET = ENV.cronSecret;

export function startCronRentIptAll() {
  if (!TOKEN) {
    throw new Error("CRON_TOKEN is missing");
  }

  if (!SECRET) {
    throw new Error("CRON_SECRET is missing");
  }

  if (global.rentIptAllCronStarted) {
    return;
  }

  global.rentIptAllCronStarted = true;

  cron.schedule(
    "0 18 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน อัตโนมัติ");

      try {
        const baseUrl =
          ENV.appUrl;

        const url = `${baseUrl}/api/rent-ipt-alert/rent-ipt-all`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "x-cron-token": TOKEN,
            "x-cron-secret": SECRET,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        console.log(
          "✅ ส่งรายงาน RentIptAll สำเร็จ:",
          data.meta.count,
          "รายการ",
        );
      } catch (error) {
        console.error("❌ ส่งรายงานล้มเหลว:", error);
      }
    },
    {
      timezone: "Asia/Bangkok",
    },
  );

  console.log(
    "✅ Rent Ipt All สำหรับส่ง LINE Notify ทุกวัน 18:00 เริ่มทำงานแล้ว",
  );
}
