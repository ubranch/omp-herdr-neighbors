import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const run = promisify(execFile);
const REFRESH_EVERY_TURNS = 10;
const AGENT_FIELDS = [
  "pane_id", "agent", "agent_status", "cwd", "workspace_id", "terminal_title_stripped",
] as const;

type Agent = {
  pane_id: string;
  agent: string;
  agent_status: string;
  cwd: string;
  workspace_id: string;
  terminal_title_stripped: string;
  name?: string | null;
};

function isAgent(value: unknown): value is Agent {
  if (!value || typeof value !== "object") return false;
  const agent = value as Record<string, unknown>;
  return AGENT_FIELDS.every((field) => typeof agent[field] === "string")
    && !!agent.pane_id && !!agent.agent
    && (agent.name == null || typeof agent.name === "string");
}

function clean(value: string, max: number): string {
  const text = value.replace(/\s+/gu, " ").trim();
  return (text.length > max ? `${text.slice(0, max - 1)}…` : text)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Sent once per session: later blocks are list-only to save tokens.
const GUIDE = [
  "Line format: pane[(name)] kind status cwd | title",
  "Read: herdr agent read <pane> --source recent-unwrapped --lines 120",
  "Prompt, send-keys or close other panes only when the user asks.",
];

export default function herdrNeighbors(omp: ExtensionAPI): void {
  const ownPane = process.env.HERDR_PANE_ID;
  if (process.env.HERDR_ENV !== "1" || !ownPane || process.env.OMPCODE === "1") return;

  const workspace = process.env.HERDR_WORKSPACE_ID;
  let lastKey: string | undefined;
  let turnsSinceInjection = 0;
  let guideSent = false;

  omp.on("before_agent_start", async () => {
    turnsSinceInjection++;
    try {
      const { stdout } = await run(process.env.HERDR_BIN || "herdr", ["agent", "list"], {
        timeout: 2_000,
        maxBuffer: 1_048_576,
        encoding: "utf8",
        windowsHide: true,
      });
      const data = JSON.parse(stdout);
      const agents: unknown = data?.result?.agents;
      if (!Array.isArray(agents)) return;

      const neighbors = agents.filter(isAgent).filter((agent) => agent.pane_id !== ownPane);
      neighbors.sort((a, b) => {
        const aCurrent = a.workspace_id === workspace;
        const bCurrent = b.workspace_id === workspace;
        if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
        return a.pane_id.localeCompare(b.pane_id);
      });
      const key = JSON.stringify(neighbors.map((agent) => [
        agent.pane_id, agent.agent, agent.cwd, agent.name ?? "", agent.agent_status,
      ]));
      if (key === lastKey && turnsSinceInjection < REFRESH_EVERY_TURNS) return;

      const lines = neighbors.slice(0, 12).map((agent) =>
        `${clean(agent.pane_id, 40)}${agent.name ? `(${clean(agent.name, 32)})` : ""}`
        + ` ${clean(agent.agent, 20)} ${clean(agent.agent_status, 20)}`
        + ` ${clean(agent.cwd, 160)} | ${clean(agent.terminal_title_stripped, 60)}`,
      );
      if (!neighbors.length) lines.push("No other agents.");
      if (neighbors.length > 12) lines.push(`+${neighbors.length - 12} more`);
      const content = [
        "<herdr-neighbors>",
        ...(guideSent ? [] : GUIDE),
        ...lines,
        "</herdr-neighbors>",
      ].join("\n");
      lastKey = key;
      turnsSinceInjection = 0;
      guideSent = true;
      return { message: { customType: "herdr-neighbors", content, display: false } };
    } catch {
      return;
    }
  });
}
