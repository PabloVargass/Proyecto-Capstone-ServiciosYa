import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendRequest, ApiError } from "@/services/backend";
import { sameOrigin, SESSION_COOKIE, sessionOptions } from "@/auth/session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Origen no autorizado." },
      { status: 403 },
    );
  try {
    const body: unknown = await request.json();
    const session = await backendRequest<{ accessToken: string }>(
      "/admin-auth/login",
      { method: "POST", body: JSON.stringify(body) },
    );
    (await cookies()).set(SESSION_COOKIE, session.accessToken, sessionOptions);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof ApiError ? error.message : "Solicitud inválida.",
      },
      { status: error instanceof ApiError ? error.status : 400 },
    );
  }
}
