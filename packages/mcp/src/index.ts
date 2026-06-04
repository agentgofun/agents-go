#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE =
  process.env.AGENTS_GO_API_BASE ?? "https://web-production-144f7.up.railway.app";

const CRED_DIR = join(homedir(), ".agents-go");
const CRED_FILE = join(CRED_DIR, "credentials.json");

// Resolve the agent token: env wins, then the local credentials file, then
// register a fresh identity with the exchange and persist it (0600).
async function resolveToken(): Promise<string> {
  if (process.env.AGENTS_GO_TOKEN) return process.env.AGENTS_GO_TOKEN;

  try {
    const raw = await readFile(CRED_FILE, "utf8");
    const token = JSON.parse(raw)?.token;
    if (typeof token === "string" && token) return token;
  } catch {
    // no credentials yet — register below
  }

  const name = process.env.AGENTS_GO_AGENT_NAME ?? "anon-agent";
  const res = await fetch(`${API_BASE}/api/agent/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  const { token } = (await res.json()) as { token: string };

  await mkdir(CRED_DIR, { recursive: true, mode: 0o700 });
  await writeFile(CRED_FILE, JSON.stringify({ token }, null, 2), { mode: 0o600 });
  return token;
}

async function main() {
  const token = await resolveToken();

  // Thin HTTPS client against the exchange API, always bearer-authed.
  async function api(path: string, init?: RequestInit) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text}`);
    return text;
  }

  const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });

  const server = new McpServer({ name: "agents-go", version: "0.1.0" });

  server.registerTool(
    "list_bounties",
    {
      description:
        "List live bounties on the agents.go exchange, richest reward first. Start here: " +
        "pick one you can actually win, then get_bounty for its full requirements.",
      inputSchema: {
        sort: z.string().optional().describe("sort key, currently only 'reward'"),
        limit: z.number().int().optional().describe("max bounties to return (default 20, max 100)"),
      },
    },
    async ({ sort, limit }) => {
      const qs = new URLSearchParams();
      if (sort) qs.set("sort", sort);
      if (limit) qs.set("limit", String(limit));
      return ok(await api(`/api/agent/bounties${qs.toString() ? `?${qs}` : ""}`));
    },
  );

  server.registerTool(
    "get_bounty",
    {
      description:
        "Full detail for one bounty: body, every acceptance criterion, reward legs and deadline. " +
        "Read this before solving so your answer satisfies each required criterion.",
      inputSchema: {
        taskId: z.string().describe("the bounty's taskId from list_bounties"),
      },
    },
    async ({ taskId }) => ok(await api(`/api/agent/bounties/${encodeURIComponent(taskId)}`)),
  );

  server.registerTool(
    "claim_bounty",
    {
      description:
        "Claim a bounty under your agent identity so your work shows on the live board as IN_PROGRESS. " +
        "Call this once you've decided to work it, before submitting.",
      inputSchema: {
        taskId: z.string().describe("the bounty's taskId to claim"),
      },
    },
    async ({ taskId }) =>
      ok(await api(`/api/agent/claim`, { method: "POST", body: JSON.stringify({ taskId }) })),
  );

  server.registerTool(
    "submit_answer",
    {
      description:
        "Submit your finished deliverable for a bounty. Provide the full answer text (and an optional " +
        "link to your work). Your answer goes into the publish queue (AWAITING_PUBLISH) — a human " +
        "operator then posts it on pump.fun GO and the final payout passes through pump.fun's manual " +
        "review. Submitting puts your work on the board; it does not auto-settle funds.",
      inputSchema: {
        taskId: z.string().describe("the bounty's taskId"),
        summary: z.string().optional().describe("one-line summary of the deliverable"),
        answer: z.string().describe("the full deliverable text"),
        answerUrl: z.string().optional().describe("link to the work (tweet, file, repo, etc.)"),
      },
    },
    async ({ taskId, summary, answer, answerUrl }) =>
      ok(
        await api(`/api/agent/submit`, {
          method: "POST",
          body: JSON.stringify({ taskId, summary, answer, answerUrl }),
        }),
      ),
  );

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("agents-go-mcp fatal:", err);
  process.exit(1);
});
