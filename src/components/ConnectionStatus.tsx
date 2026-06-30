"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

type Status = "connected" | "connecting" | "disconnected" | "error";

interface ConnectionStatusProps {
  showLabel?: boolean;
}

export default function ConnectionStatus({ showLabel = true }: ConnectionStatusProps) {
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [notifyStatus, setNotifyStatus] = useState<Status>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isMounted = useRef(true);

  const checkDatabase = useCallback(async () => {
    try {
      const res = await fetch("/api/connection-status/hosxp", {
        method: "GET",
        cache: "no-store",
      });
      setDbStatus(res.ok ? "connected" : "error");
    } catch {
      setDbStatus("disconnected");
    }
  }, []);

  const checkNotify = useCallback(async () => {
    try {
      const res = await fetch("/api/connection-status/notify", {
        method: "GET",
        cache: "no-store",
      });
      setNotifyStatus(res.ok ? "connected" : "error");
    } catch {
      setNotifyStatus("disconnected");
    }
  }, []);

  const checkAll = useCallback(async () => {
    await Promise.all([checkDatabase(), checkNotify()]);
    setLastUpdated(new Date());
  }, [checkDatabase, checkNotify]);

  // Initial check + Polling
  useEffect(() => {
    isMounted.current = true;

    // Initial check (ใช้ setTimeout เพื่อเลี่ยง warning)
    const init = setTimeout(() => {
      if (isMounted.current) checkAll();
    }, 0);

    const interval = setInterval(() => {
      if (isMounted.current) checkAll();
    }, 30000);

    return () => {
      isMounted.current = false;
      clearTimeout(init);
      clearInterval(interval);
    };
  }, [checkAll]);

  const getStatusConfig = (status: Status) => {
    switch (status) {
      case "connected":
        return { color: "bg-emerald-500", text: "เชื่อมต่อปกติ" };
      case "connecting":
        return { color: "bg-amber-500", text: "กำลังตรวจสอบ" };
      case "disconnected":
        return { color: "bg-red-500", text: "ขาดการเชื่อมต่อ" };
      default:
        return { color: "bg-red-500", text: "เกิดข้อผิดพลาด" };
    }
  };

  const dbConfig = getStatusConfig(dbStatus);
  const notifyConfig = getStatusConfig(notifyStatus);

  return (
    <div className="flex flex-row gap-6">
      {/* HOSxP Database */}
      <div className="flex items-center gap-3" title={`อัพเดทล่าสุด: ${lastUpdated ? lastUpdated.toLocaleTimeString("th-TH") : "กำลังโหลด..."}`}>
        <div className="relative">
          <div className={`h-3 w-3 rounded-full ${dbConfig.color} ring-2 ring-white dark:ring-zinc-900`} />
          {dbStatus === "connecting" && (
            <Loader2 className="absolute inset-0 h-3 w-3 animate-spin text-amber-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">HOSxP Database</p>
          {showLabel && <p className="text-xs text-slate-500">{dbConfig.text}</p>}
        </div>
      </div>

      {/* Line Notify */}
      <div className="flex items-center gap-3" title={`อัพเดทล่าสุด: ${lastUpdated ? lastUpdated.toLocaleTimeString("th-TH") : "กำลังโหลด..."}`}>
        <div className="relative">
          <div className={`h-3 w-3 rounded-full ${notifyConfig.color} ring-2 ring-white dark:ring-zinc-900`} />
          {notifyStatus === "connecting" && (
            <Loader2 className="absolute inset-0 h-3 w-3 animate-spin text-amber-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">Line Notify</p>
          {showLabel && <p className="text-xs text-slate-500">{notifyConfig.text}</p>}
        </div>
      </div>
    </div>
  );
}