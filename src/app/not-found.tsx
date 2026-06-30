import Link from "next/link";
import { Home } from "lucide-react";
import BackButton from "@/components/BackButton";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-[120px] font-bold text-primary/10 mb-6 select-none">
          404
        </div>

        <h1 className="text-5xl font-bold text-foreground mb-3">
          ไม่พบหน้านี้
        </h1>

        <p className="text-muted-foreground text-lg mb-10">
          หน้าที่คุณกำลังค้นหาไม่มีอยู่ในระบบ
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-medium hover:bg-primary/90 transition"
          >
            <Home className="h-5 w-5" />
            กลับหน้าหลัก
          </Link>

          <BackButton />
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          MOPH NOTIFY ARANHOS © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
