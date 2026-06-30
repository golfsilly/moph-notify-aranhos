import { ENV } from "@/config/env";
import cron from "node-cron";

declare global {
  var rentIptInternCronStarted: boolean | undefined;
}

const SECRET_TOKEN = ENV.cronToken;

export function startCronRentIptIntern() {
  if (!SECRET_TOKEN) {
    throw new Error("CRON_SECRET_TOKEN is missing");
  }

  if (global.rentIptInternCronStarted) {
    return;
  }

  global.rentIptInternCronStarted = true;

  cron.schedule(
    "0 18 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน อัตโนมัติ");

      try {
        const baseUrl = ENV.appUrl || "http://localhost:50000";

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

        console.log(
          "✅ ส่งรายงาน RentIptIntern สำเร็จ:",
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
    "✅ Rent Ipt Intern สำหรับส่ง LINE Notify ทุกวัน 18:00 เริ่มทำงานแล้ว",
  );
}
