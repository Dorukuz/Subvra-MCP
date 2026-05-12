import crypto from "crypto";

type McpTokenPayload = {
  uid: string;
  exp: number;
};

const TOKEN_PREFIX = "subvra_mcp";

function getSecret(): string {
  const secret = process.env.MCP_TOKEN_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("MCP_TOKEN_SECRET is not configured");
  }
  return secret;
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function issueMcpToken(uid: string, ttlSeconds = 60 * 60 * 24): string {
  const payload: McpTokenPayload = {
    uid,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(encodedPayload);
  return `${TOKEN_PREFIX}.${encodedPayload}.${sig}`;
}

export function verifyMcpToken(token: string): { uid: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [prefix, encodedPayload, sig] = parts;
  if (prefix !== TOKEN_PREFIX) return null;

  const expected = signPayload(encodedPayload);
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as McpTokenPayload;
    if (!payload?.uid || typeof payload.uid !== "string") return null;
    if (!payload?.exp || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

