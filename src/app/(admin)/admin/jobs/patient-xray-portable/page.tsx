import Link from "next/link";
import { ArrowLeft, BellRing, CheckCircle2, Clock3, Database, XCircle } from "lucide-react";
import { getAdminDashboardData } from "@/services/admin/admin-dashboard.service";
import { hasAdminAccess } from "@/services/admin/admin-access.service";

export const dynamic = "force-dynamic";

function Status({ value }: { value: "ok" | "warning" | "error" | "unknown" }) {
  const config = {
    ok: { label: "ปกติ", className: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    warning: { label: "ต้องตรวจสอบ", className: "bg-amber-100 text-amber-700", Icon: Clock3 },
    error: { label: "ผิดพลาด", className: "bg-red-100 text-red-700", Icon: XCircle },
    unknown: { label: "ยังไม่มีข้อมูล", className: "bg-slate-100 text-slate-600", Icon: Clock3 },
  }[value];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}><config.Icon className="h-3.5 w-3.5" />{config.label}</span>;
}

export default async function PatientXrayPortableAdminPage() {
  if (!(await hasAdminAccess())) return null;
  const data = await getAdminDashboardData();
  const job = data.xrayPortable;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-sky-700"><ArrowLeft className="h-4 w-4" />กลับไป Jobs</Link>
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><BellRing className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-sky-600">Job detail</p><h1 className="text-2xl font-bold text-slate-900">Patient X-ray Portable</h1><p className="mt-1 text-sm text-slate-500">Read-only operational detail — ไม่มีข้อมูลผู้ป่วย</p></div>
            </div>
            <Status value={job.heartbeat.status} />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Schedule" value={`${job.schedule} (${job.timezone})`} />
          <Metric label="Cursor xn" value={job.cursor ?? "ยังไม่เริ่มต้น"} />
          <Metric label="Last run" value={job.heartbeat.lastRunAt ? new Date(job.heartbeat.lastRunAt).toLocaleString("th-TH") : "ยังไม่มีข้อมูล"} />
          <Metric label="Duration" value={job.heartbeat.lastRunDurationMs === null ? "-" : `${job.heartbeat.lastRunDurationMs} ms`} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Database className="h-5 w-5 text-sky-600" /><h2 className="text-lg font-bold text-slate-900">Outbox health</h2></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Pending" value={String(job.outbox.pending)} />
            <Metric label="Processing" value={String(job.outbox.processing)} />
            <Metric label="Failed" value={String(job.outbox.failed)} />
            <Metric label="Sent" value={String(job.outbox.sent)} />
          </div>
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
            <Metric label="Total attempts" value={String(job.outbox.totalAttempts)} />
            <Metric label="Oldest pending" value={job.outbox.oldestPendingAt ? new Date(job.outbox.oldestPendingAt).toLocaleString("th-TH") : "ไม่มี"} />
            <Metric label="Latest error" value={job.outbox.latestError ?? "ไม่มี"} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 break-words font-semibold text-slate-800">{value}</p></div>;
}
