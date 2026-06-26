import { NextResponse } from "next/server";
import { queryHos } from "@/lib/hosdb";

export async function GET() {
  try {
    const today = new Date();

    // endDate = วันปัจจุบัน - 5 วัน
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

    // สร้างข้อความ
    let messageText = `📊 รายงาน IPT\n`;
    messageText += `วันที่: ${endDate}\n`;
    messageText += `ช่วงข้อมูล: ${startDate} ถึง ${endDate}\n\n`;

    if (data && data.length > 0) {
      data.forEach((item: any, index: number) => {
        messageText += `${index + 1}. ${item.doctor} : ${item.total_rent} ครั้ง\n`;
      });
    } else {
      messageText += "ไม่พบข้อมูล\n";
    }

    messageText += `\n#RentIPT #ระบบแจ้งเตือน`;

    // ส่ง LINE Notify
    const payload = {
      messages: [
        {
          type: "text",
          text: messageText,
        },
      ],
    };

    const response = await fetch(
      "https://morpromt2f.moph.go.th/api/notify/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client-key": "59d47ade30eb64c9d1ff4f529e51cc840b1d33d7",
          "secret-key": "7SZ62DYLYNUE3YRJZXRKQVM5XC7Y",
        },
        // headers: {
        //   "Content-Type": "application/json",
        //   "client-key": "de7e3e0df4fbd9ea53355c65e946b5f61953db17",
        //   "secret-key": "MV6IHUANMSULAAWS34H7QNTQXDMA",
        // },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    console.log("LINE Notify Status:", response.status);
    console.log("Response:", result);

    return NextResponse.json({
      success: true,
      message: "ส่งแจ้งเตือนสำเร็จ",
      dataCount: data.length,
    });
  } catch (error: any) {
    console.error("Error sending LINE notify:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
