export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-32 rounded-2xl bg-white shadow-sm" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
