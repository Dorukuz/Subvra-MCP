# Subvra MCP Agent Skill

Use this skill to drive screenshot generation through Subvra MCP.

## Core flow

1. Ensure MCP server `subvra` is running.
2. Authenticate once:
   - Tool: `mcp_auth`
   - Action: `set`
   - Provide Firebase ID token as `authToken`.
3. Generate screenshots:
   - Tool: `generate_screenshots`
   - Required: `devices`
   - Optional: `prompt`, `appStoreUrl`, `referenceScreenshots`.
4. Check outputs:
   - Tool: `list_generations`
   - Tool: `get_generation`

## Best practices

- Use short, clear headline/subheadline in prompts.
- Include app screenshot data URLs for visual consistency.
- Use 2–4 variations per key device.
- Review and regenerate until composition and readability are correct.
