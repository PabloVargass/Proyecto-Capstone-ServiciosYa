import { NextResponse } from "next/server";
import { sameOrigin } from "@/auth/session";
import { backendRequest, ApiError } from "@/services/backend";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "Origen no autorizado." },
      { status: 403 },
    );
  try {
    return NextResponse.json(
      await backendRequest("/admin-auth/accept-invitation", {
        method: "POST",
        body: JSON.stringify(await request.json()),
      }),
    );
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
