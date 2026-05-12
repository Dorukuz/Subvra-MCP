import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "child_process";
import * as z from "zod/v4";

const server = new McpServer({
  name: "subvra-agent-mcp",
  version: "1.0.1",
});

const baseUrl = (process.env.SUBVRA_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
let sessionAuthToken: string | null = null;

async function openUrlOnDevice(url: string): Promise<void> {
  const platform = process.platform;
  if (platform === "darwin") {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("open", [url], { stdio: "ignore" });
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`open exited with code ${code}`))));
    });
    return;
  }
  if (platform === "win32") {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("cmd", ["/c", "start", "", url], { stdio: "ignore" });
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`start exited with code ${code}`))));
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn("xdg-open", [url], { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`xdg-open exited with code ${code}`))));
  });
}

async function subvraRequest<T>(
  path: string,
  init: { method?: string; authToken?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init.authToken) {
    headers.Authorization = `Bearer ${init.authToken}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const data = (await response.json().catch(() => ({}))) as T | { error?: string };
  if (!response.ok) {
    const err = (data as { error?: string })?.error || `HTTP ${response.status}`;
    throw new Error(`${path} failed: ${err}`);
  }
  return data as T;
}

server.registerTool(
  "mcp_auth",
  {
    description: "Set/clear auth token, check status, or open browser sign-in for MCP token flow.",
    inputSchema: {
      action: z.enum(["set", "clear", "status", "signin"]).describe("Auth session action"),
      authToken: z.string().optional().describe("MCP auth token (required for action=set)"),
    },
  },
  async ({ action, authToken }) => {
    if (action === "signin") {
      const signInUrl = `${baseUrl}/sign-in?next=${encodeURIComponent("/dashboard/mcp")}`;
      await openUrlOnDevice(signInUrl);
      return {
        content: [
          {
            type: "text",
            text:
              "Opened browser for Subvra sign-in. After login, open /dashboard/mcp, generate token, then call mcp_auth(action=set, authToken=<token>).",
          },
        ],
      };
    }
    if (action === "set") {
      if (!authToken || authToken.trim().length === 0) {
        throw new Error("authToken is required when action=set");
      }
      sessionAuthToken = authToken.trim();
      return {
        content: [{ type: "text", text: "Auth token stored for this MCP session." }],
      };
    }
    if (action === "clear") {
      sessionAuthToken = null;
      return {
        content: [{ type: "text", text: "Auth token cleared for this MCP session." }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: sessionAuthToken ? "Auth token is currently set." : "No auth token set.",
        },
      ],
    };
  }
);

server.registerTool(
  "health_check",
  {
    description: "Check Subvra API health endpoint.",
    inputSchema: {},
  },
  async () => {
    const data = await subvraRequest<unknown>("/api/health");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "billing_catalog",
  {
    description: "Get configured plans/topups available in Subvra billing.",
    inputSchema: {},
  },
  async () => {
    const data = await subvraRequest<unknown>("/api/billing/catalog");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "generate_screenshots",
  {
    description:
      "Create a screenshot generation job in Subvra. Auth: omit authToken if you already called mcp_auth(action=set) with a dashboard MCP token or Firebase ID token; otherwise pass authToken once per call.",
    inputSchema: {
      authToken: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Optional. Firebase ID token or dashboard MCP token. If omitted, uses token from mcp_auth(action=set)."
        ),
      prompt: z.string().optional(),
      appStoreUrl: z.string().optional(),
      devices: z
        .array(
          z.object({
            deviceId: z.string().min(1),
            count: z.number().int().min(1).max(8).optional(),
          })
        )
        .min(1)
        .describe("Target devices and optional per-device count"),
      referenceScreenshots: z
        .array(z.string().startsWith("data:image/"))
        .max(3)
        .optional()
        .describe("Optional app screenshot data URLs"),
    },
  },
  async ({ authToken, prompt, appStoreUrl, devices, referenceScreenshots }) => {
    const token = authToken || sessionAuthToken;
    if (!token) {
      throw new Error("No auth token provided. Use mcp_auth(action=set) or pass authToken.");
    }
    const payload: Record<string, unknown> = { devices };
    if (prompt) payload.prompt = prompt;
    if (appStoreUrl) payload.appStoreUrl = appStoreUrl;
    if (referenceScreenshots?.length) payload.referenceScreenshots = referenceScreenshots;

    const data = await subvraRequest<unknown>("/api/generate", {
      method: "POST",
      authToken: token,
      body: payload,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "list_generations",
  {
    description:
      "List recent generation jobs for the authenticated user/team scope. Auth: session from mcp_auth(set) or optional authToken per call.",
    inputSchema: {
      authToken: z
        .string()
        .min(1)
        .optional()
        .describe("Optional. Firebase ID token or MCP token; if omitted, uses mcp_auth session token."),
      scope: z.enum(["personal", "team"]).optional(),
    },
  },
  async ({ authToken, scope }) => {
    const token = authToken || sessionAuthToken;
    if (!token) {
      throw new Error("No auth token provided. Use mcp_auth(action=set) or pass authToken.");
    }
    const query = scope ? `?scope=${scope}` : "";
    const data = await subvraRequest<unknown>(`/api/generations${query}`, {
      authToken: token,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  "get_generation",
  {
    description:
      "Get detailed status/results for one generation job. Auth: session from mcp_auth(set) or optional authToken per call.",
    inputSchema: {
      authToken: z
        .string()
        .min(1)
        .optional()
        .describe("Optional. Firebase ID token or MCP token; if omitted, uses mcp_auth session token."),
      jobId: z.string().min(1),
    },
  },
  async ({ authToken, jobId }) => {
    const token = authToken || sessionAuthToken;
    if (!token) {
      throw new Error("No auth token provided. Use mcp_auth(action=set) or pass authToken.");
    }
    const data = await subvraRequest<unknown>(`/api/generations/${encodeURIComponent(jobId)}`, {
      authToken: token,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[subvra-agent-mcp] fatal error:", error);
  process.exit(1);
});
