export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Starting cron jobs");

    // startRentIptStaffCron();
    // startRentIptInternCron();
    const { startPatientXrayPortableCron } =
      await import("./lib/cron/patient-xray-portable");
    startPatientXrayPortableCron();
  }
}
