import { NextResponse } from "next/server";
import { queryHos } from "@/lib/hosdb";

// Vercel จะเรียกไฟล์นี้ตามกำหนดเวลา
export async function GET(request: Request) {
  try {
    // ตรวจสอบว่าเรียกจาก Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // === เรียกใช้งานฟังก์ชันส่งแจ้งเตือน ===
    const today = new Date();
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() - 5);

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

    let messageText = `📊 รายการค้างสรุปชาร์ท\n`;
    messageText += `📅 วันที่: ${today.toISOString().split("T")[0]}\n`;
    messageText += `📍 ช่วง: ${startDate} ถึง ${endDate}\n\n`;

    if (data?.length > 0) {
      data.forEach((item: any, i: number) => {
        messageText += `${i + 1}. ${item.doctor} → ${item.total_rent} ชาร์ท\n`;
      });
    }

    messageText += `\n#RentIPTAlert`;

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

    console.log(`✅ Vercel Cron Job สำเร็จ - ${new Date().toLocaleString('th-TH')}`);

    return NextResponse.json({ 
      success: true, 
      message: "ส่ง LINE Notify สำเร็จ",
      dataCount: data.length 
    });

  } catch (error: any) {
    console.error("❌ Vercel Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}