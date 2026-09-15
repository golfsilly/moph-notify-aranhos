import { ENV } from "@/config/env";

/**
 * A message can be:
 * - a plain string -> sent as a LINE {type: "text"} message
 * - a pre-built LINE message object (e.g. {type: "flex", altText, contents})
 *   -> sent as-is, letting callers use flex/image/etc. message types
 */
type LineMessagePayload = string | Record<string, unknown>;

/**
 * Dedicated LINE notify client for the X-ray Portable feature only.
 *
 * This is intentionally a separate class from the shared LineNotifyService
 * (used by rent-ipt, digital, bod, hospital, etc.) so that:
 *  - changing the X-ray message format (e.g. to Flex Message) can never
 *    break the other groups' plain-text notifications
 *  - a burst of X-ray failures trips its OWN circuit breaker, instead of
 *    tripping the shared breaker and silently blocking every other group's
 *    notifications too
 *  - the X-ray LINE client-key/secret-key can be rotated independently
 */
export class XrayLineNotifyService {
  private static failCount = 0;
  private static isOpen = false;
  private static lastFailTime = 0;

  private static readonly CIRCUIT_LIMIT = 5;
  private static readonly RESET_TIME = 60 * 1000;

  static async send(
    message: LineMessagePayload,
    retry: number = 3,
  ): Promise<boolean> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailTime > this.RESET_TIME) {
        this.reset();
      } else {
        console.warn("🚫 [XrayLineNotify] Circuit breaker OPEN");
        return false;
      }
    }

    // TODO: currently pointed at the "test" group config until a dedicated
    // xray-portable LINE OA group (its own client-key/secret-key) is set
    // up in ENV.lineNotify. Swap this to ENV.lineNotify.xrayPortable then.
    const config = ENV.lineNotify.xrayPortable;
    const lineMessage = this.buildLineMessage(message);

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
            messages: [lineMessage],
          }),
        });

        if (response.ok) {
          this.recordSuccess();
          return true;
        }

        console.warn(
          `Line Notify (xray-portable) Failed (${i}/${retry}): ${response.status}`,
        );
      } catch (error) {
        console.warn(
          `Line Notify (xray-portable) Error (${i}/${retry})`,
          error,
        );
      }

      if (i < retry) {
        await new Promise((r) => setTimeout(r, i * 600));
      }
    }

    this.recordFailure();
    return false;
  }

  /**
   * Normalize a caller-supplied payload into the LINE "messages" array item.
   * - string -> {type: "text", text: message}
   * - object -> used as-is (caller is responsible for a valid LINE message
   *   shape, e.g. {type: "flex", altText: "...", contents: {...}})
   */
  private static buildLineMessage(
    message: LineMessagePayload,
  ): Record<string, unknown> {
    if (typeof message === "string") {
      return { type: "text", text: message };
    }
    return message;
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
