import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: 200,
      results: "Hello MOPH NOTIFY ARANHOS API 🌻🌍",
    });
  } catch (error: unknown) {
    let errorMessage: unknown;

    if (error instanceof Error) {
      try {
        errorMessage = JSON.parse(error.message);
      } catch {
        errorMessage = error.message;
      }
    } else {
      errorMessage = "Unknown error";
    }

    return NextResponse.json({
      status: 500,
      results: errorMessage,
    });
  }
}