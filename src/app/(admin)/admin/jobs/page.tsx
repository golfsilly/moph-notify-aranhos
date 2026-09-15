import Link from "next/link";
import { Activity, ArrowRight, BriefcaseBusiness, Clock3 } from "lucide-react";
import { getAdminDashboardData } from "@/services/admin/admin-dashboard.service";
import { ADMIN_JOBS } from "@/services/admin/admin-job-registry";
import { hasAdminAccess } from "@/services/admin/admin-access.service";

export const dynamic = "force-dynamic";

function JobStatus({ status }: { status: "ok" | "warning" | "error" | "unknown" }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    unknown: "bg-slate-100 text-slate-600",
  }[status];
  const labels = { ok: "ปกติ", warning: "ต้องตรวจสอบ", error: "ผิดพลาด", unknown: "ยังไม่มีข้อมูล" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{labels[status]}</span>;
}

export default async function AdminJobsPage() {
  if (!(await hasAdminAccess())) return null;
  const data = await getAdminDashboardData();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><BriefcaseBusiness className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-sky-600">Operations</p>
              <h1 className="text-2xl font-bold text-slate-900">Background Jobs</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">ศูนย์รวมสถานะงานเบื้องหลังทั้งหมด รองรับการเพิ่ม job ใหม่ในอนาคต</p>
        </header>

        <div className="grid gap-4 xl:grid-cols-2">
          {ADMIN_JOBS.map((job) => {
            const health = job.key === "patient-xray-portable" && data
              ? data.xrayPortable.heartbeat.status
              : "unknown" as const;
            const heartbeat = job.key === "patient-xray-portable" && data ? data.xrayPortable.heartbeat : null;
            return (
              <Link key={job.key} href={job.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Activity className="h-5 w-5" /></div>
                    <div>
                      <h2 className="font-bold text-slate-900">{job.label}</h2>
                      <p className="mt-1 text-sm text-slate-500">{job.description}</p>
                    </div>
                  </div>
                  <JobStatus status={health} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Schedule</p><p className="mt-1 font-semibold text-slate-800">{job.schedule}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Target</p><p className="mt-1 font-semibold text-slate-800">LINE Test Group</p></div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{heartbeat?.lastRunAt ? new Date(heartbeat.lastRunAt).toLocaleString("th-TH") : "ยังไม่มี heartbeat"}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-sky-600">ดูรายละเอียด <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
