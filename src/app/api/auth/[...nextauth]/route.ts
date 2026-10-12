import type { NextRequest } from "next/server";
import { handlers, authConfigured } from "~/server/auth";
export async function GET(request: NextRequest) {
  return authConfigured()
    ? handlers.GET(request)
    : Response.json(
        { error: "Admin sign-in is not configured" },
        { status: 503 },
      );
}
export async function POST(request: NextRequest) {
  return authConfigured()
    ? handlers.POST(request)
    : Response.json(
        { error: "Admin sign-in is not configured" },
        { status: 503 },
      );
}
