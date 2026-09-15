"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Inbox,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminDashboardData,
  AdminHealthStatus,
} from "@/services/admin/admin-dashboard.service";

interface AdminDashboardProps {
  initialData: AdminDashboardData | null;
}

const numberFormatter = new Intl.NumberFormat("th-TH");

function formatNumber(value: number | null): string {
  return value === null ? "-" : numberFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "ยังไม่มีข้อมูล";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: AdminHealthStatus }) {
  const config = {
    ok: { label: "ปกติ", className: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    warning: { label: "ต้องตรวจสอบ", className: "bg-amber-100 text-amber-700", Icon: AlertTriangle },
    error: { label: "ผิดพลาด", className: "bg-red-100 text-red-700", Icon: XCircle },
    unknown: { label: "ยังไม่มีข้อมูล", className: "bg-slate-100 text-slate-600", Icon: Clock3 },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <config.Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function ConnectionCard({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: AdminHealthStatus;
  icon: typeof Database;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 font-semibold text-slate-800">การเชื่อมต่อ</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-red-700">
          <XCircle className="h-6 w-6" />
          <h1 className="text-xl font-bold">ไม่สามารถอ่านสถานะระบบได้</h1>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          ตรวจสอบการเชื่อมต่อ Prisma และลอง refresh อีกครั้ง
        </p>
      </div>
    </main>
  );
}

export default function AdminDashboard({ initialData }: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const refreshingRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      startTransition(() => {
        router.refresh();
        window.setTimeout(() => {
          refreshingRef.current = false;
          setLastRefresh(new Date());
        }, 1000);
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [router]);

  const refreshDashboard = () => {
    setLastRefresh(new Date());
    startTransition(() => router.refresh());
  };

  if (!initialData) return <EmptyState />;

  const { connections, xrayPortable } = initialData;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sky-600">MOPH NOTIFY ARANHOS</p>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                ภาพรวมสถานะระบบแจ้งเตือนและ X-ray Portable แบบ read-only
              </p>
            </div>
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
              Admin preview — authentication ยังไม่เปิดใช้งาน
            </span>
            <span>อัปเดตข้อมูล: {lastRefresh.toLocaleTimeString("th-TH")}</span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3" aria-label="Connection status">
          <ConnectionCard label="HOSxP Database" status={connections.hosxp} icon={Database} />
          <ConnectionCard label="Prisma Database" status={connections.prisma} icon={Server} />
          <ConnectionCard label="LINE Notify" status={connections.lineNotify} icon={Inbox} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-sky-600">Background job</p>
              <h2 className="text-xl font-bold text-slate-900">Patient X-ray Portable</h2>
            </div>
            <StatusBadge status={xrayPortable.heartbeat.status} />
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Schedule</p>
              <p className="mt-2 font-semibold text-slate-800">{xrayPortable.schedule}</p>
              <p className="text-xs text-slate-500">{xrayPortable.timezone}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cursor (xn)</p>
              <p className="mt-2 break-all font-semibold text-slate-800">{xrayPortable.cursor ?? "ยังไม่เริ่มต้น"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last run</p>
              <p className="mt-2 font-semibold text-slate-800">{formatDate(xrayPortable.heartbeat.lastRunAt)}</p>
              <p className="text-xs text-slate-500">สถานะ {xrayPortable.heartbeat.lastRunStatus ?? "-"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Duration</p>
              <p className="mt-2 font-semibold text-slate-800">
                {xrayPortable.heartbeat.lastRunDurationMs === null ? "-" : `${xrayPortable.heartbeat.lastRunDurationMs} ms`}
              </p>
            </div>
          </div>

          {xrayPortable.heartbeat.lastRunError && (
            <div className="mx-6 mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span className="font-semibold">Last error:</span> {xrayPortable.heartbeat.lastRunError}
            </div>
          )}

          <div className="grid gap-4 border-t border-slate-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Pending" value={xrayPortable.outbox.pending} tone="amber" />
            <Metric label="Processing" value={xrayPortable.outbox.processing} tone="blue" />
            <Metric label="Failed" value={xrayPortable.outbox.failed} tone="red" />
            <Metric label="Sent" value={xrayPortable.outbox.sent} tone="emerald" />
          </div>

          <div className="grid gap-4 border-t border-slate-100 p-6 text-sm sm:grid-cols-3">
            <Info label="Total attempts" value={formatNumber(xrayPortable.outbox.totalAttempts)} />
            <Info label="Oldest pending" value={formatDate(xrayPortable.outbox.oldestPendingAt)} />
            <Info label="Latest error code" value={xrayPortable.outbox.latestError ?? "ไม่มี"} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "red" | "emerald" }) {
  const classes = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className={`rounded-xl p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{formatNumber(value)}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] truncate text-right font-semibold text-slate-800" title={value}>{value}</span>
    </div>
  );
}
