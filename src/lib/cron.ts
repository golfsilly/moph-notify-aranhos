import cron from "node-cron";

const SECRET_TOKEN = process.env.LINE_NOTIFY_SECRET!;

let isCronStarted = false;

export function startCronTest() {
  if (isCronStarted) return;
  isCronStarted = true;
  // ทุกวัน เวลา 16:00 น.
  cron.schedule(
    "0 16 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน IPT อัตโนมัติตอน 16:00");

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3300");

        const url = `${baseUrl}/api/test?token=${SECRET_TOKEN}`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await res.json();
        console.log("✅ ส่งรายงานสำเร็จ:", result);
      } catch (error) {
        console.error("❌ ส่งรายงานล้มเหลว:", error);
      }
    },
    {
      timezone: "Asia/Bangkok",
    },
  );

  console.log("✅ Cron Job สำหรับส่ง LINE Notify ทุกวัน 16:00 เริ่มทำงานแล้ว");
}

export function startCronRentIptAll() {
  // ทุกวัน เวลา 16:00 น.
  cron.schedule(
    "0 16 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน IPT อัตโนมัติตอน 16:00");

      try {
        const res = await fetch(
          "http://localhost:3300/api/rent-ipt-alert/rent-ipt-all",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await res.json();
        console.log("✅ ส่งรายงานสำเร็จ:", result);
      } catch (error) {
        console.error("❌ ส่งรายงานล้มเหลว:", error);
      }
    },
    {
      timezone: "Asia/Bangkok",
    },
  );

  console.log("✅ Cron Job สำหรับส่ง LINE Notify ทุกวัน 16:00 เริ่มทำงานแล้ว");
}

export function startCronRentIptIntern() {
  // ทุกวัน เวลา 16:00 น.
  cron.schedule(
    "0 16 * * *",
    async () => {
      console.log("🚀 เริ่มส่งรายงาน IPT อัตโนมัติตอน 16:00");

      try {
        const res = await fetch(
          "http://localhost:3300/api/rent-ipt-alert/rent-ipt-intern",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await res.json();
        console.log("✅ ส่งรายงานสำเร็จ:", result);
      } catch (error) {
        console.error("❌ ส่งรายงานล้มเหลว:", error);
      }
    },
    {
      timezone: "Asia/Bangkok",
    },
  );

  console.log("✅ Cron Job สำหรับส่ง LINE Notify ทุกวัน 16:00 เริ่มทำงานแล้ว");
}
