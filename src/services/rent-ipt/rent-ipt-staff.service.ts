import { queryHos } from "@/lib/hosdb";
import { LineNotifyService } from "../line-notify.service";
import { RowDataPacket } from "mysql2";
import { RentIptRow } from "@/types/rent-ipt.type";

type DateRange = {
  start: string;
  end: string;
  today: string;
};

// ======================================================
// Helper Functions
// ======================================================

function toRentSummary(rows: RowDataPacket[]): RentIptRow[] {
  return rows.map((row) => ({
    doctor: row.doctor as string,
    total_rent: Number(row.total_rent),
  }));
}

function getThaiTime(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000); // +7 ชั่วโมง (เวลาประเทศไทย)
}

function formatThaiShort(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันที่";
  }

  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function createSection(title: string, rows: RentIptRow[]): string {
  let text = `${title}\n`;

  if (rows.length === 0) {
    text += "ไม่มีข้อมูล\n";
  } else {
    text += rows
      .map(
        (item, index) =>
          `${index + 1}. ${item.doctor} ${item.total_rent} ชาร์ท`,
      )
      .join("\n");
  }

  return text;
}

function createMessage(
  staff: RentIptRow[],
  today: string,
  startDate: string,
  endDate: string,
): string {
  return `📊 รายงานชาร์ทค้างสรุป

📅 วันที่ ${formatThaiShort(today)}
📆 ช่วง ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}

${createSection("👩‍⚕️ Staff", staff)}

#RentIPTStaffAlert`;
}

// ======================================================
// Main Service
// ======================================================

export class RentIptStaffService {
  static async getSummary() {
    const thaiNow = getThaiTime();
    const endDate = new Date(thaiNow);
    endDate.setDate(endDate.getDate() - 5);

    const dateRange: DateRange = {
      start: "2026-05-01",
      end: endDate.toISOString().split("T")[0]!,
      today: thaiNow.toISOString().split("T")[0]!,
    };

    const [staffRows] = await Promise.all([
      queryHos(this.buildStaffSql(dateRange.start, dateRange.end)),
    ]);

    const staff = toRentSummary(staffRows);

    return { staff, dateRange };
  }

  private static buildStaffSql(startDate: string, endDate: string) {
    return `
      SELECT
        ou.NAME AS doctor,
        CAST(COUNT(*) AS UNSIGNED) AS total_rent
      FROM ipdrent o
      LEFT JOIN opduser ou ON ou.loginname = o.rent_user
      WHERE o.rent_date BETWEEN '${startDate}' AND '${endDate}'
        AND o.checkin = 'N'
        AND o.rent_user IN (
          'rachade','สรวิศ','ธนา','ชญานัสถ์','ธีรพล','อรสิรี',
          'รสสุคนธ์','sukanya','aaa','อภิชัย','นนท์','ต้อม',
          'd44918','siriwan','54680','ศศิวิมล','52233','onndar',
          'paron','56783','chonlatee','59885','d48218','fasai',
          'Suthinee','d54544','Wisarut','ฐานุปัติ','onco',
          'สมภพ','อุดม'
        )
      GROUP BY o.rent_user, ou.NAME
      ORDER BY total_rent DESC;
    `;
  }

  static async triggerReport() {
    try {
      const { staff, dateRange } = await this.getSummary();

      const message = createMessage(
        staff,
        dateRange.today,
        dateRange.start,
        dateRange.end,
      );

      const notifySuccess = await LineNotifyService.sendToRentIptStaff(message);

      return {
        success: notifySuccess,
        staff,
        dateRange,
        message,
      };
    } catch (error) {
      console.error("❌ RentIptStaffService.triggerReport Error:", error);
      throw error;
    }
  }
}
