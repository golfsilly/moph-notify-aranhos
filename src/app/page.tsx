import Image from "next/image";
import ConnectionStatus from "@/components/ConnectionStatus";
import { APP_CONFIG } from "@/config/app-config";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image
                  src="/images/logo-aranhos.png"
                  alt="ARANHOS Logo"
                  width={68}
                  height={68}
                  priority
                  className="drop-shadow-sm"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  MOPH NOTIFY
                </h1>
                <p className="text-sm text-muted-foreground">
                  ARANHOS • Hospital Notification System
                </p>
              </div>
            </div>

            <div className="absolute top-6 right-6">
              <ConnectionStatus />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex min-h-[calc(100vh-85px)] items-center justify-center px-6">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-5 py-1.5 text-sm font-medium text-primary">
            ระบบแจ้งเตือนโรงพยาบาล
          </div>

          <h2 className="text-balance text-6xl font-bold tracking-tighter md:text-7xl">
            MOPH NOTIFY{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              ARANHOS
            </span>
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            ระบบจัดการแจ้งเตือนข้อมูลสำคัญแบบเรียลไทม์
            <br />
            เชื่อมต่อโดยตรงกับฐานข้อมูล HOSxP
            เพื่อเพิ่มประสิทธิภาพการทำงานของทีมแพทย์และบุคลากร
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/dashboard"
              className="rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 hover:shadow-xl"
            >
              เข้าสู่ระบบจัดการ
            </a>

            <a
              href="#features"
              className="rounded-2xl border border-border bg-card px-8 py-4 text-lg font-semibold text-foreground transition hover:bg-muted"
            >
              ดูฟีเจอร์ทั้งหมด
            </a>
          </div>

          {/* Trust bar */}
          <div className="mt-16 flex items-center justify-center gap-8 opacity-75">
            <div className="text-sm font-medium text-muted-foreground">
              เชื่อมต่อกับ
            </div>
            <div className="flex items-center gap-6 text-muted-foreground">
              <span>HOSxP</span>
              <span className="text-xl">•</span>
              <span>Line Notify</span>
              <span className="text-xl">•</span>
              <span>MOPH</span>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -right-40 bottom-20 h-[600px] w-[600px] rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-6">{APP_CONFIG.copyright}</div>
      </footer>
    </div>
  );
}
