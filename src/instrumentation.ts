import { startCronRentIptIntern } from "./lib/cron/rent-ipt-alert/rent-api-intern";
import { startCronRentIptStaff } from "./lib/cron/rent-ipt-alert/rent-api-staff";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Starting cron jobs");

    startCronRentIptStaff();
    startCronRentIptIntern();
  }
}