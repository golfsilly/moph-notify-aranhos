import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(50000),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:50000"),

  HOS_DB_HOST: z.string().min(1, "Database host is required"),
  HOS_DB_PORT: z.coerce.number().default(3306),
  HOS_DB_NAME: z.string().min(1, "Database name is required"),
  HOS_DB_USER: z.string().min(1, "Database user is required"),
  HOS_DB_PASS: z.string().min(1, "Database password is required"),

  CRON_SECRET_TOKEN: z.string().min(1, "Cron secret token is missing"),

  LINE_NOTIFY_TEST_CLIENT_KEY: z.string().optional(),
  LINE_NOTIFY_TEST_SECRET_KEY: z.string().optional(),
  LINE_NOTIFY_RENT_IPT_CLIENT_KEY: z.string().optional(),
  LINE_NOTIFY_RENT_IPT_SECRET_KEY: z.string().optional(),
  LINE_NOTIFY_DIGITAL_CLIENT_KEY: z.string().optional(),
  LINE_NOTIFY_DIGITAL_SECRET_KEY: z.string().optional(),
  LINE_NOTIFY_HOSPITAL_CLIENT_KEY: z.string().optional(),
  LINE_NOTIFY_HOSPITAL_SECRET_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error("Invalid project environment configuration.");
}

const _env = parsedEnv.data;

export const ENV = {
  isProduction: _env.NODE_ENV === "production",
  port: _env.PORT,
  appUrl: _env.NEXT_PUBLIC_APP_URL,
  db: {
    host: _env.HOS_DB_HOST,
    port: _env.HOS_DB_PORT,
    name: _env.HOS_DB_NAME,
    user: _env.HOS_DB_USER,
    pass: _env.HOS_DB_PASS,
  },

  cronToken: _env.CRON_SECRET_TOKEN,

  lineNotifyTestClientKey: _env.LINE_NOTIFY_TEST_CLIENT_KEY || "",
  lineNotifyTestSecretKey: _env.LINE_NOTIFY_TEST_SECRET_KEY || "",

  lineNotifyRentIptClientKey: _env.LINE_NOTIFY_RENT_IPT_CLIENT_KEY || "",
  lineNotifyRentIptSecretKey: _env.LINE_NOTIFY_RENT_IPT_SECRET_KEY || "",

  lineNotifyDigitalClientKey: _env.LINE_NOTIFY_DIGITAL_CLIENT_KEY || "",
  lineNotifyDigitalSecretKey: _env.LINE_NOTIFY_DIGITAL_SECRET_KEY || "",

  lineNotifyHospitalClientKey: _env.LINE_NOTIFY_HOSPITAL_CLIENT_KEY || "",
  lineNotifyHospitalSecretKey: _env.LINE_NOTIFY_HOSPITAL_SECRET_KEY || "",
} as const;

export type EnvType = typeof ENV;
