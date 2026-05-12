import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { rateLimitByIp } from "@/lib/rate-limit";

const MAX_PROMPT_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipLimit = await rateLimitByIp(ip, "drafts", 30, 60);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(ipLimit.resetIn) } }
    );
  }

  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const draftId = randomUUID();

    return NextResponse.json({
      draftId,
      status: "pending",
      message: "Draft saved. Sign in to generate.",
    });
  } catch (error) {
    console.error("[drafts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
