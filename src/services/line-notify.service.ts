import { ENV } from "@/config/env";

type LineGroup =
  | "test"
  | "xray-portable"
  | "rent-ipt-staff"
  | "rent-ipt-intern"
  | "digital"
  | "digital-mission"
  | "bod"
  | "hospital";

interface LineNotifyConfig {
  clientKey: string;
  secretKey: string;
}

export class LineNotifyService {
  private static failCount = 0;
  private static isOpen = false;
  private static lastFailTime = 0;

  private static readonly CIRCUIT_LIMIT = 5;
  private static readonly RESET_TIME = 60 * 1000;

  static async sendToTest(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("test", message, retry);
  }
  static async sendToXrayPortable(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("xray-portable", message, retry);
  }
  static async sendToRentIptStaff(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("rent-ipt-staff", message, retry);
  }
  static async sendToRentIptIntern(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("rent-ipt-intern", message, retry);
  }
  static async sendToDigital(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("digital", message, retry);
  }
  static async sendToDigitalMission(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("digital-mission", message, retry);
  }
  static async sendToBod(message: string, retry: number = 3): Promise<boolean> {
    return this.sendToGroup("bod", message, retry);
  }
  static async sendToHospital(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("hospital", message, retry);
  }

  private static async sendToGroup(
    group: LineGroup,
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailTime > this.RESET_TIME) {
        this.reset();
      } else {
        console.warn("🚫 Circuit breaker OPEN");
        return false;
      }
    }

    let config: LineNotifyConfig;
    switch (group) {
      case "test":
        config = ENV.lineNotify.test;
        break;
      case "xray-portable":
        config = ENV.lineNotify.xrayPortable;
        break;
      case "rent-ipt-staff":
        config = ENV.lineNotify.rentIptStaff;
        break;
      case "rent-ipt-intern":
        config = ENV.lineNotify.rentIptIntern;
        break;
      case "digital":
        config = ENV.lineNotify.digital;
        break;
      case "digital-mission":
        config = ENV.lineNotify.digitalMission;
        break;
      case "bod":
        config = ENV.lineNotify.bod;
        break;
      case "hospital":
        config = ENV.lineNotify.hospital;
        break;
      default:
        console.error(`❌ LineNotify: Unknown group "${group}"`);
        return false;
    }

    for (let i = 1; i <= retry; i++) {
      try {
        const response = await fetch(ENV.lineNotify.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "client-key": config.clientKey,
            "secret-key": config.secretKey,
          },
          body: JSON.stringify({
            messages: [{ type: "text", text: message }],
          }),
        });

        if (response.ok) {
          this.recordSuccess();
          return true;
        }

        console.warn(
          `Line Notify (${group}) Failed (${i}/${retry}): ${response.status}`,
        );
      } catch (error) {
        console.warn(`Line Notify (${group}) Error (${i}/${retry})`, error);
      }

      if (i < retry) {
        await new Promise((r) => setTimeout(r, i * 600));
      }
    }

    this.recordFailure();
    return false;
  }

  private static recordSuccess(): void {
    this.failCount = 0;
    this.isOpen = false;
  }

  private static recordFailure(): void {
    this.failCount++;
    this.lastFailTime = Date.now();
    if (this.failCount >= this.CIRCUIT_LIMIT) this.isOpen = true;
  }

  private static reset(): void {
    this.failCount = 0;
    this.isOpen = false;
  }
}
