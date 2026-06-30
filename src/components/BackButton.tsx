"use client";

import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center justify-center gap-2 border border-border hover:bg-muted px-8 py-4 rounded-2xl font-medium transition"
    >
      <ArrowLeft className="h-5 w-5" />
      ย้อนกลับ
    </button>
  );
}