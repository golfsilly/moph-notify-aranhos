import cron from "node-cron";

declare global {
  var rentIptStaffCronStarted: boolean | undefined;
}

const SECRET_TOKEN = process.env.CRON_SECRET_TOKEN!;

export function startCronRentIptStaff() {
  if (!SECRET_TOKEN) {
    throw new Error("CRON_SECRET_TOKEN is missing");
  }

  if (global.rentIptStaffCronStarted) {
    return;
  }

  global.rentIptStaffCronStarted = true;

  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน อัตโนมัติ");

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:50000");

        const url = `${baseUrl}/api/rent-ipt-alert/rent-ipt-staff`;

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
          "✅ ส่งรายงาน RentIptStaff สำเร็จ:",
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
    "✅ Rent Ipt Staff สำหรับส่ง LINE Notify ทุกวัน 09:00 เริ่มทำงานแล้ว",
  );
}
