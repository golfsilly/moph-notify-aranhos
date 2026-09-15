import { NextRequest, NextResponse } from "next/server";

const ADMIN_ACCESS_CODE = "10870";
const ADMIN_ACCESS_COOKIE = "moph_admin_access";
const ADMIN_ACCESS_MAX_AGE = 60 * 60;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_ACCESS_MAX_AGE,
  };
}

export async function GET(request: NextRequest) {
  const hasAccess = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value === "1";
  return NextResponse.json({ authorized: hasAccess }, { status: hasAccess ? 200 : 401 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (code !== ADMIN_ACCESS_CODE) {
      return NextResponse.json(
        { authorized: false, message: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ authorized: true });
    response.cookies.set(ADMIN_ACCESS_COOKIE, "1", cookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { authorized: false, message: "คำขอไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authorized: false });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return response;
}
