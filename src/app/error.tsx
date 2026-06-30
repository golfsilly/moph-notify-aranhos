"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          เกิดข้อผิดพลาด
        </h2>

        <p className="text-muted-foreground mb-8">
          ขออภัย ระบบเกิดปัญหาชั่วคราว
          <br />
          กรุณาลองใหม่อีกครั้ง
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-white font-medium hover:bg-primary/90 transition"
          >
            <RefreshCw className="h-5 w-5" />
            ลองใหม่
          </button>

          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            กลับไปหน้าหลัก
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-[10px] text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
