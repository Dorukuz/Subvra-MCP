import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Guide — Subvra",
  description:
    "User guide: how to generate App Store screenshots with AI agents using Subvra MCP.",
};

export default function McpGuidePage() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-14 lg:py-16">
        <article className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
            Documentation
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Subvra MCP User Guide
          </h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-300">
            Use Subvra with AI agents to create App Store screenshot sets faster while keeping
            device consistency and production-ready exports.
          </p>

          <div className="mt-8 rounded-2xl border border-primary-400/30 bg-primary-500/10 p-5">
            <p className="text-sm font-semibold text-primary-100">Quickstart</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-primary-100/90">
              <li>Run the one-command auto installer for your client config.</li>
              <li>Authenticate once using the MCP auth flow.</li>
              <li>Ask your agent to generate screenshots with prompt + devices.</li>
              <li>Review, iterate, then download final PNG assets.</li>
            </ol>
          </div>

          <div className="mt-10 space-y-10">
            <section id="auto-install">
              <h2 className="text-2xl font-semibold">One-Command Auto Install</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Use the installer script to patch Cursor/VS Code MCP config automatically.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900 p-4 font-mono text-xs text-slate-200">
                <code>{`curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/public/downloads/install-subvra-mcp.sh -o install-subvra-mcp.sh
bash install-subvra-mcp.sh`}</code>
              </pre>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="/downloads/install-subvra-mcp.sh"
                  download
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                >
                  Download auto installer
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                After GitHub publish, replace <span className="font-mono">YOUR_ORG/YOUR_REPO</span>{" "}
                with your real repository path.
              </p>
            </section>

            <section id="install-clients">
              <h2 className="text-2xl font-semibold">Install for Agent Clients</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Choose your client and follow the setup command/template. This follows the same
                model used by modern MCP docs and client-specific installation flows.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900 p-4 font-mono text-xs text-slate-200">
                <code>{`# Claude Code example
claude mcp add subvra --transport stdio -- npm run mcp:subvra

# Run server
npm run mcp:subvra`}</code>
              </pre>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Cursor",
                    "Use MCP settings and add a stdio server running `npm run mcp:subvra`.",
                  ],
                  [
                    "Claude Code",
                    "Add MCP via CLI and run Subvra server command in your project.",
                  ],
                  [
                    "Codex",
                    "Configure MCP endpoint/command in Codex MCP settings.",
                  ],
                  [
                    "VS Code",
                    "Use MCP user/workspace config and include Subvra server entry.",
                  ],
                ].map(([client, text]) => (
                  <div key={client} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-mono text-xs text-primary-200">{client}</p>
                    <p className="mt-1 text-sm text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="downloads">
              <h2 className="text-2xl font-semibold">Downloads</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Download ready-to-use config/templates for quick setup.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="/downloads/subvra-mcp-cursor.json"
                  download
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                >
                  Download Cursor MCP config
                </a>
                <a
                  href="/downloads/subvra-skill.md"
                  download
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                >
                  Download Subvra Agent Skill
                </a>
                <a
                  href="/downloads/subvra-mcp-commands.txt"
                  download
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                >
                  Download install commands
                </a>
              </div>
            </section>

            <section id="workflow">
              <h2 className="text-2xl font-semibold">Workflow</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Step 1", "Input prompt + optional app screenshots"],
                  ["Step 2", "Pick iPhone/iPad outputs and variation count"],
                  ["Step 3", "Generate set with shared master composition"],
                  ["Step 4", "Review, iterate, and export final PNGs"],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-mono text-xs text-primary-200">{title}</p>
                    <p className="mt-1 text-sm text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="prompting">
              <h2 className="text-2xl font-semibold">Prompting Best Practices</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
                <li>Keep headline and subheadline short and specific.</li>
                <li>Name the visual style (minimal, premium, playful, bold).</li>
                <li>Mention target audience and primary app value proposition.</li>
                <li>If needed, specify “include uploaded app screenshot in final image”.</li>
              </ul>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900 p-4 font-mono text-xs text-slate-200">
                <code>{`Headline: Smart Spaced Repetition
Subheadline: Review at the right time
Style: Premium educational, warm-neutral palette, clean typography
Layout: Portrait, app screen as hero, no watermark`}</code>
              </pre>
            </section>

            <section id="devices">
              <h2 className="text-2xl font-semibold">Devices and Variations</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                The first selected device acts as the master composition. Other devices adapt from
                it so your iPhone and iPad screenshots stay visually aligned.
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-mono text-xs text-primary-200">Recommended</p>
                <p className="mt-1 text-sm text-slate-300">
                  2–4 variations per important device for better creative selection.
                </p>
              </div>
            </section>

            <section id="export">
              <h2 className="text-2xl font-semibold">Export and Delivery</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
                <li>Download outputs as PNG after generation completes.</li>
                <li>Validate readability at real device preview scale.</li>
                <li>Upload final assets to App Store Connect.</li>
              </ul>
            </section>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              On this page
            </p>
            <nav className="mt-3 space-y-1 text-sm">
              {[
                ["One-Command Auto Install", "#auto-install"],
                ["Install for Agent Clients", "#install-clients"],
                ["Downloads", "#downloads"],
                ["Workflow", "#workflow"],
                ["Prompting Best Practices", "#prompting"],
                ["Devices and Variations", "#devices"],
                ["Export and Delivery", "#export"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="block rounded-md px-2 py-1.5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </section>
  );
}
