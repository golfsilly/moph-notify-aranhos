import { RowDataPacket } from "mysql2";

export interface RentIptRow extends RowDataPacket {
  doctor: string;
  total_rent: string;

}