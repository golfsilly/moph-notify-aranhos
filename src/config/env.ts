import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(50000),

    // === Database ===
    HOS_DB_HOST: z.string().min(1, "HOS_DB_HOST is required"),
    HOS_DB_HOST_SLAVE: z.string().min(1, "HOS_DB_HOST_SLAVE is required"),
    HOS_DB_PORT: z.coerce.number().int().positive().default(3306),
    HOS_DB_USER: z.string().min(1, "HOS_DB_USER is required"),
    HOS_DB_PASS: z.string().min(1, "HOS_DB_PASS is required"),

    HOS_DB_NAME: z.string().min(1, "HOS_DB_NAME is required"),
    HOS_DB_RCM_NAME: z.string().min(1, "HOS_DB_RCM_NAME is required"),
    HOS_DB_REFER_NAME: z.string().min(1, "HOS_DB_REFER_NAME is required"),

    CRON_TOKEN:z.string().min(32, "CRON_TOKEN must be at least 32 characters"),
    CRON_SECRET:z.string().min(32, "CRON_SECRET must be at least 32 characters"),
    ALLOWED_CRON_IPS: z.string().optional(),

    // Line Notify (optional)   
    LINE_NOTIFY_ENDPOINT: z.url(),

    LINE_NOTIFY_TEST_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_TEST_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_RENT_IPT_STAFF_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_RENT_IPT_STAFF_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_RENT_IPT_INTERN_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_RENT_IPT_INTERN_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_DIGITAL_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_DIGITAL_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_DIGITAL_MISSION_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_DIGITAL_MISSION_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_BOD_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_BOD_SECRET_KEY: z.string().optional(),

    LINE_NOTIFY_HOSPITAL_CLIENT_KEY: z.string().optional(),
    LINE_NOTIFY_HOSPITAL_SECRET_KEY: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

    HOS_DB_HOST: process.env.HOS_DB_HOST,
    HOS_DB_HOST_SLAVE: process.env.HOS_DB_HOST_SLAVE,
    HOS_DB_PORT: process.env.HOS_DB_PORT,
    HOS_DB_USER: process.env.HOS_DB_USER,
    HOS_DB_PASS: process.env.HOS_DB_PASS,

    HOS_DB_NAME: process.env.HOS_DB_NAME,
    HOS_DB_RCM_NAME: process.env.HOS_DB_RCM_NAME,
    HOS_DB_REFER_NAME: process.env.HOS_DB_REFER_NAME,

    CRON_TOKEN: process.env.CRON_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    ALLOWED_CRON_IPS: process.env.ALLOWED_CRON_IPS,

    LINE_NOTIFY_ENDPOINT: process.env.LINE_NOTIFY_ENDPOINT,

    LINE_NOTIFY_TEST_CLIENT_KEY: process.env.LINE_NOTIFY_TEST_CLIENT_KEY,
    LINE_NOTIFY_TEST_SECRET_KEY: process.env.LINE_NOTIFY_TEST_SECRET_KEY,

    LINE_NOTIFY_RENT_IPT_STAFF_CLIENT_KEY: process.env.LINE_NOTIFY_RENT_IPT_STAFF_CLIENT_KEY,
    LINE_NOTIFY_RENT_IPT_STAFF_SECRET_KEY: process.env.LINE_NOTIFY_RENT_IPT_STAFF_SECRET_KEY,

    LINE_NOTIFY_RENT_IPT_INTERN_CLIENT_KEY: process.env.LINE_NOTIFY_RENT_IPT_INTERN_CLIENT_KEY,
    LINE_NOTIFY_RENT_IPT_INTERN_SECRET_KEY: process.env.LINE_NOTIFY_RENT_IPT_INTERN_SECRET_KEY,

    LINE_NOTIFY_DIGITAL_CLIENT_KEY: process.env.LINE_NOTIFY_DIGITAL_CLIENT_KEY,
    LINE_NOTIFY_DIGITAL_SECRET_KEY: process.env.LINE_NOTIFY_DIGITAL_SECRET_KEY,

    LINE_NOTIFY_DIGITAL_MISSION_CLIENT_KEY: process.env.LINE_NOTIFY_DIGITAL_MISSION_CLIENT_KEY,
    LINE_NOTIFY_DIGITAL_MISSION_SECRET_KEY: process.env.LINE_NOTIFY_DIGITAL_MISSION_SECRET_KEY,

    LINE_NOTIFY_BOD_CLIENT_KEY: process.env.LINE_NOTIFY_BOD_CLIENT_KEY,
    LINE_NOTIFY_BOD_SECRET_KEY: process.env.LINE_NOTIFY_BOD_SECRET_KEY,

    LINE_NOTIFY_HOSPITAL_CLIENT_KEY: process.env.LINE_NOTIFY_HOSPITAL_CLIENT_KEY,
    LINE_NOTIFY_HOSPITAL_SECRET_KEY: process.env.LINE_NOTIFY_HOSPITAL_SECRET_KEY,
  },

  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});

export const ENV = {
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  port: env.PORT,
  appUrl: env.NEXT_PUBLIC_APP_URL,

  hosdb: {
    host: env.HOS_DB_HOST,
    hostSlave: env.HOS_DB_HOST_SLAVE,
    port: env.HOS_DB_PORT,
    user: env.HOS_DB_USER,
    pass: env.HOS_DB_PASS,
    name: env.HOS_DB_NAME,
  },

  rcmdb: {
    host: env.HOS_DB_HOST,
    port: env.HOS_DB_PORT,
    user: env.HOS_DB_USER,
    pass: env.HOS_DB_PASS,
    name: env.HOS_DB_RCM_NAME,
  },

  referdb: {
    host: env.HOS_DB_HOST,
    port: env.HOS_DB_PORT,
    user: env.HOS_DB_USER,
    pass: env.HOS_DB_PASS,
    name: env.HOS_DB_REFER_NAME,
  },

  cronToken: env.CRON_TOKEN,
  cronSecret: env.CRON_SECRET,
  allowedCronIps: env.ALLOWED_CRON_IPS?.split(",").map(ip => ip.trim()) ?? [],
  

  lineNotify: {
    endpoint: env.LINE_NOTIFY_ENDPOINT,
    test: {
      clientKey: env.LINE_NOTIFY_TEST_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_TEST_SECRET_KEY ?? "",
    },
    rentIptStaff: {
      clientKey: env.LINE_NOTIFY_RENT_IPT_STAFF_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_RENT_IPT_STAFF_SECRET_KEY ?? "",
    },
    rentIptIntern: {
      clientKey: env.LINE_NOTIFY_RENT_IPT_INTERN_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_RENT_IPT_INTERN_SECRET_KEY ?? "",
    },
    digital: {
      clientKey: env.LINE_NOTIFY_DIGITAL_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_DIGITAL_SECRET_KEY ?? "",
    },
    digitalMission: {
      clientKey: env.LINE_NOTIFY_DIGITAL_MISSION_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_DIGITAL_MISSION_SECRET_KEY ?? "",
    },
    bod: {
      clientKey: env.LINE_NOTIFY_BOD_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_BOD_SECRET_KEY ?? "",
    },
    hospital: {
      clientKey: env.LINE_NOTIFY_HOSPITAL_CLIENT_KEY ?? "",
      secretKey: env.LINE_NOTIFY_HOSPITAL_SECRET_KEY ?? "",
    },
  },
} as const;

export type EnvType = typeof ENV;