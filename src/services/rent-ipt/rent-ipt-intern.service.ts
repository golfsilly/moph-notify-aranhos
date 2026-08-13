import { queryHos } from "@/lib/hosdb";
import { RentIptRow } from "@/types/rent-ipt.type";
import { RowDataPacket } from "mysql2";
import { LineNotifyService } from "../line-notify.service";

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
  intern: RentIptRow[],
  today: string,
  startDate: string,
  endDate: string,
): string {
  return `📊 รายงานชาร์ทค้างสรุป

📅 วันที่ ${formatThaiShort(today)}
📆 ช่วง ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}

${createSection("👨‍⚕️ แพทย์ใช้ทุน", intern)}

#RentIPTInternAlert`;
}

// ======================================================
// Main Service
// ======================================================

export class RentIptInternService {
  static async getSummary() {
    const thaiNow = getThaiTime();
    const endDate = new Date(thaiNow);
    endDate.setDate(endDate.getDate() - 5);

    const dateRange: DateRange = {
      start: "2026-07-01",
      end: endDate.toISOString().split("T")[0]!,
      today: thaiNow.toISOString().split("T")[0]!,
    };

    const [internRows] = await Promise.all([
      queryHos(this.buildInternSql(dateRange.start, dateRange.end)),
    ]);

    const intern = toRentSummary(internRows);

    return { intern, dateRange };
  }

  private static buildInternSql(startDate: string, endDate: string) {
    return `
      SELECT
        ou.NAME AS doctor,
        CAST(COUNT(*) AS UNSIGNED) AS total_rent
      FROM ipdrent o
      LEFT JOIN opduser ou ON ou.loginname = o.rent_user
      WHERE o.rent_date BETWEEN '${startDate}' AND '${endDate}'
        AND o.checkin = 'N'
        AND o.rent_user IN (
          'Kanokporn_s','chalisa','Sorarath','84170','9568',
          '82505','83371','83382'
        )
      GROUP BY o.rent_user, ou.NAME
      ORDER BY total_rent DESC;
    `;
  }

  static async triggerReport() {
    try {
      const { intern, dateRange } = await this.getSummary();

      const message = createMessage(
        intern,
        dateRange.today,
        dateRange.start,
        dateRange.end,
      );

      const notifySuccess =
        await LineNotifyService.sendToRentIptIntern(message);

      return {
        success: notifySuccess,
        intern,
        dateRange,
        message,
      };
    } catch (error) {
      console.error("❌ RentIptInternService.triggerReport Error:", error);
      throw error;
    }
  }
}
