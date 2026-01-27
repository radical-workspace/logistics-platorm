import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { access_token, refresh_token } = (await req.json()) as {
    access_token?: string | null;
    refresh_token?: string | null;
  };

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("https://")[1]?.split(".supabase.co")[0];
  if (!projectRef) {
    return NextResponse.json({ error: "Missing supabase projectRef" }, { status: 500 });
  }

  // This matches what your layouts/routes read:
  const cookieName = `sb-${projectRef}-auth-token`;

  // Supabase stores a JSON string in this cookie. Keep it minimal.
  const cookieValue = JSON.stringify({
    access_token,
    refresh_token,
    token_type: "bearer",
  });

  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // local dev; set true in prod
    path: "/",
  });

  return res;
}
