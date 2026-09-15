import { cookies } from "next/headers";

export const ADMIN_ACCESS_COOKIE = "moph_admin_access";

export async function hasAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_ACCESS_COOKIE)?.value === "1";
}
