import crypto from "crypto";

export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

console.log("🔐 === Cron Security Tokens ===");

console.log(`CRON_TOKEN=${generateToken(32)}`);
console.log(`CRON_SECRET=${generateToken(32)}`);
