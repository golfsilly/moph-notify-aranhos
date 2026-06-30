"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              ระบบขัดข้อง
            </h1>
            <p className="text-lg text-muted-foreground mb-10">
              เกิดข้อผิดพลาดร้ายแรงที่ไม่สามารถกู้คืนได้โดยอัตโนมัติ
            </p>

            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-primary/90 transition"
            >
              รีโหลดหน้าใหม่
            </button>

            <p className="mt-8 text-sm text-muted-foreground">
              หากยังมีปัญหา โปรดติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
