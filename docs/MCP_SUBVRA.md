# Subvra MCP Server (for AI agents)

This repo includes a local MCP server that lets agents use Subvra via tools.

## Fast install for users (after GitHub push)

Offer this one-liner in your README/site:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/public/downloads/install-subvra-mcp.sh -o install-subvra-mcp.sh && bash install-subvra-mcp.sh
```

This auto-patches Cursor/VS Code MCP config.

## Run

```bash
npm run mcp:subvra
```

## Environment

- `SUBVRA_BASE_URL` (optional, default: `http://localhost:3000`)
- `MCP_TOKEN_SECRET` (required for MCP token issuing/verification)

Protected tools accept a Firebase ID token or a dashboard MCP token. In the MCP tool schema,
`authToken` is **optional** on `generate_screenshots`, `list_generations`, and `get_generation` so
clients do not reject calls before the server runs: call `mcp_auth(action=set)` once, then omit
`authToken` on those tools. You can still pass `authToken` per call if you prefer.

## Tools exposed

- `mcp_auth` — set/clear/check MCP session auth token + open sign-in browser
- `health_check` — check `/api/health`
- `billing_catalog` — read plans/topups from `/api/billing/catalog`
- `generate_screenshots` — call `/api/generate`
- `list_generations` — call `/api/generations`
- `get_generation` — call `/api/generations/:jobId`

## Notes

- `generate_screenshots.referenceScreenshots` accepts image data URLs (`data:image/...`).
- This MCP is intentionally thin: it forwards to your existing Subvra HTTP APIs.
- `generate_screenshots`, `list_generations`, and `get_generation` will use tool-level
  `authToken` if provided, otherwise fall back to the token set by `mcp_auth`.
- Use `mcp_auth` sign-in flow:
  1. `mcp_auth(action="signin")` to open browser on the user's device.
  2. Sign in and open `/dashboard/mcp`, generate MCP token.
  3. `mcp_auth(action="set", authToken="<token>")`.
- For Claude/Codex style UX, document a client command in your README after publish:
  - `claude mcp add subvra --transport stdio -- npm run mcp:subvra`
