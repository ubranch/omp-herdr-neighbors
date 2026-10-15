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

function quote(value: string): string {
  return JSON.stringify(value.replace(/\s+/gu, " ").slice(0, 160))
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export default function herdrNeighbors(omp: ExtensionAPI): void {
  const ownPane = process.env.HERDR_PANE_ID;
  if (process.env.HERDR_ENV !== "1" || !ownPane || process.env.OMPCODE === "1") return;

  const workspace = process.env.HERDR_WORKSPACE_ID;
  let lastKey: string | undefined;
  let turnsSinceInjection = 0;

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
        `- pane_id=${quote(agent.pane_id)}${agent.name ? ` name=${quote(agent.name)}` : ""}`
        + ` kind=${quote(agent.agent)} status=${quote(agent.agent_status)}`
        + ` cwd=${quote(agent.cwd)} title=${quote(agent.terminal_title_stripped)}`,
      );
      if (!neighbors.length) lines.push("No other agents.");
      if (neighbors.length > 12) lines.push(`+${neighbors.length - 12} more`);
      const content = [
        "<herdr-neighbors>",
        ...lines,
        "herdr agent read <pane> --source recent-unwrapped --lines 120",
        "herdr agent get <pane>",
        'herdr agent prompt <target> "..." --wait --timeout 120000',
        'herdr pane list --workspace "$HERDR_WORKSPACE_ID"',
        "Read freely; prompt/send-keys/close only when the user asks.",
        "</herdr-neighbors>",
      ].join("\n");
      lastKey = key;
      turnsSinceInjection = 0;
      return { message: { customType: "herdr-neighbors", content, display: false } };
    } catch {
      return;
    }
  });
}
