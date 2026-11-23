import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const password = process.env.WTF_PASSWORD;
    const form = await request.formData();
    const given = form.get("password");
    if (!password || typeof given !== "string" || given !== password) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, await sessionToken(password), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
