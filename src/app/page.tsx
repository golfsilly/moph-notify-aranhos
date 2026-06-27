import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logo-aranhos.png"
              alt="ARANHOS Logo"
              width={65}
              height={65}
              priority
            />

            <div>
              <h1 className="text-xl font-bold text-violet-700">
                MOPH NOTIFY ARANHOS
              </h1>

              <p className="text-sm text-gray-500">
                Notification Management System
              </p>
            </div>
          </div>

          <div className="rounded-full bg-violet-100 px-4 py-2 text-sm text-violet-700">
            ระบบแจ้งเตือนโรงพยาบาล
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex min-h-screen flex-1 items-center justify-center px-6">
        <section className="max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            MOPH NOTIFY
            <span className="text-violet-600"> ARANHOS</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            ระบบจัดการแจ้งเตือนข้อมูลสำคัญภายในโรงพยาบาล เชื่อมต่อข้อมูล HOSxP
            เพื่อเพิ่มประสิทธิภาพการทำงาน
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-3 text-center text-sm text-gray-500">
        MOPH NOTIFY ARANHOS © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
