import { sendRentIptStaff } from "@/app/api/rent-ipt-alert/rent-ipt-staff/route";

type RentIptRow = {
  doctor: string;
  total_rent: number;
};

export default async function RentIptAlertPage() {
  const data: RentIptRow[] = await sendRentIptStaff();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            รายงานสรุปชาร์ทค้าง Staff
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            สรุปจำนวนครั้งการยืมชาร์ทแยกตามแพทย์
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 border-b bg-slate-50 p-5 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4 border">
              <p className="text-sm text-slate-500">จำนวนแพทย์</p>

              <p className="mt-1 text-3xl font-bold text-blue-600">
                {data.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 border">
              <p className="text-sm text-slate-500">จำนวนชาร์ทรวม</p>

              <p className="mt-1 text-3xl font-bold text-red-600">
                {data.reduce((sum, item) => sum + item.total_rent, 0)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">ลำดับ</th>

                  <th className="px-6 py-4 text-left font-semibold">แพทย์</th>

                  <th className="px-6 py-4 text-right font-semibold">
                    จำนวนครั้ง
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {data.length > 0 ? (
                  data.map((item, index) => (
                    <tr key={index} className="transition hover:bg-blue-50">
                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>

                      <td className="px-6 py-4 font-medium text-slate-800">
                        {item.doctor}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span
                          className="
                            inline-flex
                            min-w-12
                            justify-center
                            rounded-full
                            bg-red-100
                            px-3
                            py-1
                            font-bold
                            text-red-700
                          "
                        >
                          {item.total_rent}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
