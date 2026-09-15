// ======================================================
// X-ray Portable Types
// ======================================================

/**
 * Represents a single X-ray case from the hosxp database
 * This is the raw data returned from the database query
 */
export interface XrayCase {
  xn: number; // X-ray order number
  vn: string; // Visit number
  hn: string; // Hospital number
  order_date: string; // Order date (YYYY-MM-DD HH:MM:SS format)
  order_date_time: string; // Full datetime with time
  age: number; // Patient age
  department_name: string; // Department name
  xray_list: string; // Comma-separated list of X-ray items
  notify_key: string; // MD5 hash unique identifier for this exam
}

/**
 * Represents the result of querying X-ray data
 */
export interface XrayQueryResult {
  cases: XrayCase[];
  timestamp: Date;
  queryDuration: number; // Duration in milliseconds
}

/**
 * Represents data to be stored in the Prisma notification log
 */
export interface XrayNotificationLogData {
  notify_key: string;
  xn: string;
  vn: string;
  hn: string;
  age?: number;
  department?: string;
  xray_list?: string;
  order_date: Date;
}

/**
 * Represents the result of a notification check
 */
export interface XrayNotificationCheckResult {
  totalCasesFound: number;
  newCases: XrayCase[];
  duplicateCases: XrayCase[];
  notificationsSent: number;
  failedNotifications: number;
  message: string;
}
