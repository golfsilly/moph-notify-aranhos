import { startCronRentIptAll } from "./lib/cron/rent-ipt-alert/rent-api-all";
import { startCronRentIptStaff } from "./lib/cron/rent-ipt-alert/rent-api-staff";
import { startCronRentIptIntern } from "./lib/cron/rent-ipt-alert/rent-api-intern";
import { startCronTest } from "./lib/cron/test";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Starting cron jobs");

    // startCronTest()
    // startCronRentIptAll();
    startCronRentIptStaff();
    startCronRentIptIntern();
  }
}