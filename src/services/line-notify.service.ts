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
  private static readonly failures = new Map<LineGroup, { count: number; lastAt: number }>();

  private static readonly CIRCUIT_LIMIT = 5;
  private static readonly RESET_TIME = 60 * 1000;

  static async sendToTest(
    message: string,
    retry: number = 3,
  ): Promise<boolean> {
    return this.sendToGroup("test", message, retry);
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
    const failure = this.failures.get(group);
    if (failure && failure.count >= this.CIRCUIT_LIMIT) {
      if (Date.now() - failure.lastAt > this.RESET_TIME) {
        this.failures.delete(group);
      } else {
        console.warn(`🚫 Circuit breaker OPEN for ${group}`);
        return false;
      }
    }

    let config: LineNotifyConfig;
    switch (group) {
      case "test":
        config = ENV.lineNotify.test;
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
          signal: AbortSignal.timeout(20_000),
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
          this.failures.delete(group);
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

    this.failures.set(group, {
      count: (this.failures.get(group)?.count ?? 0) + 1,
      lastAt: Date.now(),
    });
    return false;
  }
}
