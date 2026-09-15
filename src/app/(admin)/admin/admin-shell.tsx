"use client";

import {
  Activity,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  KeyRound,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

interface AdminShellProps {
  children: ReactNode;
  authorized: boolean;
}

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Jobs", href: "/admin/jobs", icon: BriefcaseBusiness },
  { label: "Connections", href: "/admin/connections", icon: Database },
];

export default function AdminShell({ children, authorized }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="rounded-xl bg-slate-900 p-2 text-white">
              <Activity className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">MOPH NOTIFY</p>
                <p className="truncate text-xs text-slate-500">Admin Console</p>
              </div>
            )}
          </Link>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Admin navigation">
          {!collapsed && <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Monitor</p>}
          {navigation.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && <p className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Coming soon</p>}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400" title="Authentication required">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Access control</span>}
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400" title="Coming soon">
            <CircleHelp className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Audit log</span>}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            className="hidden w-full items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 lg:flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold">Admin Console</span>
        </header>
        {authorized ? children : <AdminAccessModal />}
      </div>
    </div>
  );
}

function AdminAccessModal() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        setCode("");
        return;
      }

      router.refresh();
    } catch {
      setError("ไม่สามารถตรวจสอบรหัสผ่านได้ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-slate-950/75 p-4 backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-white/95 shadow-2xl shadow-slate-950/40 ring-1 ring-white/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-access-title"
        aria-describedby="admin-access-description"
      >
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
        <div className="p-8 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-xl shadow-slate-900/20">
            <KeyRound className="h-8 w-8" strokeWidth={1.8} />
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-600">MOPH NOTIFY</p>
            <h1 id="admin-access-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Admin Console</h1>
            <p id="admin-access-description" className="mt-3 text-sm leading-6 text-slate-500">พื้นที่สำหรับตรวจสอบระบบแจ้งเตือน กรุณาใส่รหัสเพื่อดำเนินการต่อ</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="admin-access-code" className="mb-2 block text-sm font-semibold text-slate-700">รหัสเข้าใช้งาน</label>
              <input
                id="admin-access-code"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="กรอกรหัส 5 หลัก"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-access-error" : undefined}
                className={`w-full rounded-xl border bg-white px-4 py-3.5 text-center text-lg font-semibold tracking-[0.45em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"}`}
                required
              />
              {error && <p id="admin-access-error" className="mt-2 text-center text-sm font-medium text-red-600" role="alert">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || code.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:from-sky-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "กำลังตรวจสอบ..." : "เข้าสู่ Admin Console"}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Admin preview · Authentication เบื้องต้น
          </div>
        </div>
      </div>
    </div>
  );
}
