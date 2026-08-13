import { startRentIptInternCron } from "./lib/cron/rent-ipt/intern";
import { startRentIptStaffCron } from "./lib/cron/rent-ipt/staff";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Starting cron jobs");

    startRentIptStaffCron();
    startRentIptInternCron();
  }
}
