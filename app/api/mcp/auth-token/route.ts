import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { issueMcpToken } from "@/lib/mcp-token";

const MAX_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    let ttlSeconds = DEFAULT_TTL_SECONDS;
    try {
      const body = (await req.json()) as { ttlSeconds?: number };
      if (typeof body?.ttlSeconds === "number" && Number.isFinite(body.ttlSeconds)) {
        ttlSeconds = Math.max(60 * 10, Math.min(MAX_TTL_SECONDS, Math.floor(body.ttlSeconds)));
      }
    } catch {
      // optional JSON body
    }

    const token = issueMcpToken(auth.uid, ttlSeconds);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return NextResponse.json({ token, expiresAt, ttlSeconds });
  } catch (error) {
    if (error instanceof Error && error.message.includes("MCP_TOKEN_SECRET")) {
      return NextResponse.json(
        { error: "MCP auth is not configured on server." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

