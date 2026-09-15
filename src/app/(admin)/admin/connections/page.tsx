import { Database, ExternalLink, Inbox, Server } from "lucide-react";
import { getAdminDashboardData, type AdminHealthStatus } from "@/services/admin/admin-dashboard.service";
import { hasAdminAccess } from "@/services/admin/admin-access.service";

export const dynamic = "force-dynamic";

function Status({ value }: { value: AdminHealthStatus }) {
  const styles = { ok: "bg-emerald-100 text-emerald-700", warning: "bg-amber-100 text-amber-700", error: "bg-red-100 text-red-700", unknown: "bg-slate-100 text-slate-600" }[value];
  const labels = { ok: "ปกติ", warning: "ต้องตรวจสอบ", error: "ผิดพลาด", unknown: "ยังไม่มีข้อมูล" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{labels[value]}</span>;
}

export default async function AdminConnectionsPage() {
  if (!(await hasAdminAccess())) return null;
  const data = await getAdminDashboardData();
  const connections = [
    { label: "HOSxP Database", description: "แหล่งข้อมูลคำสั่ง X-ray และข้อมูลโรงพยาบาล", status: data.connections.hosxp, icon: Database },
    { label: "Prisma Notification Database", description: "Cursor และ notification outbox", status: data.connections.prisma, icon: Server },
    { label: "LINE Notify", description: "ตรวจสอบว่าค่า configuration กลุ่ม test พร้อมใช้งาน", status: data.connections.lineNotify, icon: Inbox },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-medium text-sky-600">Infrastructure</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Connections</h1><p className="mt-3 text-sm text-slate-600">สถานะการเชื่อมต่อของระบบที่ใช้โดย background jobs</p></header>
        <div className="grid gap-4 lg:grid-cols-3">
          {connections.map((connection) => { const Icon = connection.icon; return <div key={connection.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div><Status value={connection.status} /></div><h2 className="mt-5 font-bold text-slate-900">{connection.label}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{connection.description}</p><div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400"><ExternalLink className="h-3.5 w-3.5" />Health check แบบ read-only</div></div>; })}
        </div>
      </div>
    </main>
  );
}
