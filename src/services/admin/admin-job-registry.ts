export interface AdminJobDefinition {
  key: string;
  label: string;
  description: string;
  schedule: string;
  timezone: string;
  href: string;
  enabled: boolean;
}

/**
 * Central registry for admin-visible background jobs.
 * Add future jobs here before wiring their health metrics into the dashboard.
 */
export const ADMIN_JOBS: readonly AdminJobDefinition[] = [
  {
    key: "patient-xray-portable",
    label: "Patient X-ray Portable",
    description: "ตรวจคำสั่ง Chest Portable และส่งแจ้งเตือน LINE",
    schedule: "*/2 * * * *",
    timezone: "Asia/Bangkok",
    href: "/admin/jobs/patient-xray-portable",
    enabled: true,
  },
];

export function getAdminJobDefinition(key: string): AdminJobDefinition | undefined {
  return ADMIN_JOBS.find((job) => job.key === key);
}
