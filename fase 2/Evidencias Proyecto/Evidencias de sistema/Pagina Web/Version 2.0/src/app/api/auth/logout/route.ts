import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sameOrigin, SESSION_COOKIE, sessionToken } from "@/auth/session";
import { backendRequest, ApiError } from "@/services/backend";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Origen no autorizado." },
      { status: 403 },
    );
  const token = await sessionToken();
  try {
    if (token)
      await backendRequest(
        "/admin/logout",
        { method: "POST", body: "{}" },
        token,
      );
  } catch (error) {
    if (!(error instanceof ApiError && [401, 403].includes(error.status)))
      return NextResponse.json(
        { message: "No se pudo cerrar la sesión en el servidor. Reintenta." },
        { status: 503 },
      );
  }
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
