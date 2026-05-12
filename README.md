# Subvra

App Store screenshot generation SaaS — full specification lives in [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) (full-stack: Next.js, Firebase, MongoDB, Stripe, GPT Image 2, orchestrate handoffs).

## `/orchestrate` kickoff (cloud root planner)

Prerequisites:

1. **Git remote**: Create a GitHub repository, then:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
2. **Cursor API key** (user key from [Integrations](https://cursor.com/dashboard/integrations)): `CURSOR_API_KEY`
3. If **`SLACK_BOT_TOKEN`** is set in your environment, you must also pass **`--slack-channel <id>`** (or unset the Slack token for kickoff).

From the orchestrate skill scripts directory, run (PowerShell):

```powershell
$env:CURSOR_API_KEY = "<your-key>"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User)"
cd "C:\Users\axi\.cursor\plugins\cache\cursor-public\orchestrate\d1cdb88a9eb33cf392395c87e3fd76419fc1010e\skills\orchestrate\scripts"

bun cli.ts kickoff "Build Subvra: implement the full-stack plan (Next.js App Router, Firebase auth, MongoDB, Stripe, GPT Image 2 App Store exports, credit ledger, trial, teams, admin analytics, Docker VPS). Follow design refs: imagegen-frontend-web + pbakaus/impeccable and Subvra brand tokens." `
  --repo "https://github.com/<you>/<repo>.git" `
  --ref main
```

The command prints JSON including **`url`** — open `https://cursor.com/agents/<agentId>` to follow the root planner.

**Bun**: install globally if needed: `npm install -g bun`
