'use client';

import { useRentIptAlertAll } from '../use-rent-ipt-alert';

export default function RentIptAlertPage() {
  const { data, isLoading, error } = useRentIptAlertAll();

  if (isLoading) {
    return <div className="p-8">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">เกิดข้อผิดพลาด: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">รายงานการเช่า IPT (5 วันล่าสุด)</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left border">ลำดับ</th>
              <th className="px-6 py-3 text-left border">แพทย์</th>
              <th className="px-6 py-3 text-right border">จำนวนครั้ง</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((item: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 border">{index + 1}</td>
                  <td className="px-6 py-4 border">{item.doctor}</td>
                  <td className="px-6 py-4 border text-right font-semibold">
                    {item.total_rent}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}