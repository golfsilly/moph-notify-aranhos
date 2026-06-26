import { NextResponse } from "next/server";
import { queryHos } from "@/lib/hosdb";

async function sendRentIptAlert() {
  const now = new Date();
  const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const endDateObj = new Date(thaiTime);
  endDateObj.setDate(thaiTime.getDate() - 5);

  const startDate = "2026-05-01";
  const endDate = endDateObj.toISOString().split("T")[0];

  const sql = `
    SELECT 
      ou.NAME AS doctor, 
      COUNT(*) AS total_rent 
    FROM ipdrent o 
    LEFT JOIN opduser ou ON ou.loginname = o.rent_user 
    WHERE o.rent_date BETWEEN '${startDate}' AND '${endDate}'
      AND o.checkin = 'N' 
      AND o.rent_user IN ('Kanokporn_s', 'chalisa', 'Sorarath', '84170', '9568', '82505', '83371', '83382') 
    GROUP BY o.rent_user, ou.NAME 
    ORDER BY total_rent DESC;
  `;

  const data = await queryHos(sql);

  const formatThaiShort = (dateStr: string | undefined): string => {
    if (!dateStr) return "ไม่ระบุวันที่";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "ไม่ระบุวันที่";

    return date
      .toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      .replace("พ.ศ.", "")
      .trim();
  };

  let messageText = `📊 รายการค้างสรุปชาร์ท Intern\n`;
  messageText += `📅 วันที่: ${formatThaiShort(thaiTime.toISOString().split("T")[0])}\n`;
//   messageText += `📍 ช่วงเวลา: ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}\n\n`;

  if (data?.length > 0) {
    data.forEach((item: any, i: number) => {
      const doctorName = item.doctor || "ไม่ระบุ";
      messageText += `${i + 1}. ${doctorName} ${item.total_rent} ชาร์ท\n`;
    });
  }

  messageText += `\n#RentIPTAlert`;

  try {
    await fetch("https://morpromt2f.moph.go.th/api/notify/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-key": "59d47ade30eb64c9d1ff4f529e51cc840b1d33d7",
        "secret-key": "7SZ62DYLYNUE3YRJZXRKQVM5XC7Y",
      },
      body: JSON.stringify({
        messages: [{ type: "text", text: messageText }],
      }),
    });
  } catch (fetchError) {
    console.error("LINE Notify Error:", fetchError);
  }

  return { success: true, dataCount: data.length };
}

export async function GET() {
  try {
    const result = await sendRentIptAlert();

    return NextResponse.json({
      success: true,
      message: "ทดสอบส่ง LINE Notify สำเร็จ",
      dataCount: result.dataCount,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
