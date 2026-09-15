import type { ReactNode } from "react";
import { hasAdminAccess } from "@/services/admin/admin-access.service";
import AdminShell from "./admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authorized = await hasAdminAccess();
  return <AdminShell authorized={authorized}>{authorized ? children : null}</AdminShell>;
}
