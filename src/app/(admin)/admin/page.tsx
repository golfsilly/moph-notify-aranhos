import type { Metadata } from "next";
import { getAdminDashboardData } from "@/services/admin/admin-dashboard.service";
import { hasAdminAccess } from "@/services/admin/admin-access.service";
import AdminDashboard from "./admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasAdminAccess())) return null;
  const data = await getAdminDashboardData();
  return <AdminDashboard initialData={data} />;
}
