"use client";

import { useQuery } from "@tanstack/react-query";
import { RentIptRow } from "./type";

export function useRentIptAlertAll() {
  return useQuery({
    queryKey: ["rent-ipt-alert-all"],
    queryFn: async (): Promise<RentIptRow[]> => {
      const res = await fetch("/api/rent-ipt-alert/all");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      return res.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 10 * 60 * 1000,   // 10 นาที
    gcTime: 15 * 60 * 1000,
  });
}

export function useRentIptAlertIntern() {
  return useQuery({
    queryKey: ["rent-ipt-alert-intern"],
    queryFn: async (): Promise<RentIptRow[]> => {
      const res = await fetch("/api/rent-ipt-alert/intern");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      return res.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 10 * 60 * 1000,   // 10 นาที
    gcTime: 15 * 60 * 1000,
  });
}
