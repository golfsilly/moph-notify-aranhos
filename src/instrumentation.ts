import { startCronTest } from "./lib/cron/test";
import { startCronRentIptAll } from "./lib/cron/rent-ipt-alert/rent-api-all";
import { startCronRentIptStaff } from "./lib/cron/rent-ipt-alert/rent-api-staff";
import { startCronRentIptIntern } from "./lib/cron/rent-ipt-alert/rent-api-intern";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Starting cron jobs");

    // startCronTest()
    // startCronRentIptAll();
    startCronRentIptStaff();
    startCronRentIptIntern();
  }
}