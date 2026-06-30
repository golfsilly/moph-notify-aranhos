import { APP_CONFIG } from "@/config/app-config";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {APP_CONFIG.app.name.th}
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 animate-ping rounded-full bg-primary/20" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-foreground">
              กำลังโหลดระบบ...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
