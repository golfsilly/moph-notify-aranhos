export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [
      { startRentIptInternCron },
      { startRentIptStaffCron },
      { startXrayPortableCron },
    ] = await Promise.all([
      import("./lib/cron/rent-ipt/intern"),
      import("./lib/cron/rent-ipt/staff"),
      import("./lib/cron/xray-portable"),
    ]);

    console.log("🚀 Starting cron jobs");

    startRentIptStaffCron();
    startRentIptInternCron();
    startXrayPortableCron();
  }
}
