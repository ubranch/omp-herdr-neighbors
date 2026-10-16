import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const run = promisify(execFile);
const RUN_OPTIONS = {
  timeout: 2_000, maxBuffer: 1_048_576, encoding: "utf8", windowsHide: true,
} as const;
const TOKEN_NAMES = ["task", "now", "did"] as const;
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
  tokens?: Record<string, unknown> | null;
};

function isAgent(value: unknown): value is Agent {
  if (!value || typeof value !== "object") return false;
  const agent = value as Record<string, unknown>;
  return AGENT_FIELDS.every((field) => typeof agent[field] === "string")
    && !!agent.pane_id && !!agent.agent
    && (agent.name == null || typeof agent.name === "string");
}

function oneLine(value: string, max: number): string {
  const text = value.replace(/\s+/gu, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function clean(value: string, max: number): string {
  return oneLine(value, max).replaceAll("<", "&lt;");
}

const GUIDE = [
  "Other Herdr agents. Line: pane[(name)] kind status cwd | title | asked: last prompt | did: last reply",
  'Later blocks list only changed agents. "gone" means the pane closed.',
  "Live step: herdr agent get <pane> (tokens.now). Output: herdr agent read <pane> --source recent-unwrapped --lines 120",
  "Prompt, send-keys or close other panes only when the user asks.",
];

export default function herdrNeighbors(omp: ExtensionAPI): void {
  const ownPane = process.env.HERDR_PANE_ID;
  if (process.env.HERDR_ENV !== "1" || !ownPane || process.env.OMPCODE === "1") return;

  const workspace = process.env.HERDR_WORKSPACE_ID;
  const home = homedir();
  let sent: Map<string, string> | undefined;
  const state = { task: "", now: "", did: "" };
  let publishing = false;
  let dirty = false;

  async function publish(): Promise<void> {
    if (publishing) {
      dirty = true;
      return;
    }
    publishing = true;
    do {
      dirty = false;
      const args = ["pane", "report-metadata", ownPane!, "--source", "omp-herdr-neighbors"];
      for (const name of TOKEN_NAMES) {
        if (state[name]) args.push("--token", `${name}=${state[name]}`);
        else args.push("--clear-token", name);
      }
      try {
        await run(process.env.HERDR_BIN || "herdr", args, RUN_OPTIONS);
      } catch {}
    } while (dirty);
    publishing = false;
  }

  function clearBeacon(event: { type: string }, ctx: ExtensionContext): void {
    if (ctx?.agent?.kind === "sub") return;
    if (event.type === "session_switch") sent = undefined;
    state.task = state.now = state.did = "";
    void publish();
  }
  omp.on("session_start", clearBeacon);
  omp.on("session_switch", clearBeacon);

  function resetNeighbors(_event: unknown, ctx: ExtensionContext): void {
    if (ctx?.agent?.kind === "sub") return;
    sent = undefined;
  }
  omp.on("session_compact", resetNeighbors);
  omp.on("session_branch", resetNeighbors);
  omp.on("session_tree", resetNeighbors);

  omp.on("tool_execution_start", (event, ctx) => {
    if (ctx?.agent?.kind === "sub") return;
    state.now = oneLine(event.intent || event.toolName, 60);
    void publish();
  });

  omp.on("agent_end", (event, ctx) => {
    if (ctx?.agent?.kind === "sub" || event.willContinue) return;
    const last = event.messages.findLast((message) => message.role === "assistant");
    const text = last?.role === "assistant"
      ? last.content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
      : "";
    // Herdr silently cuts token values at 80 characters; capping here keeps the "…" marker.
    state.did = oneLine((text.split(/[\r\n]/u).find((line) => line.trim()) ?? "")
      .replace(/^[\s#>*-]+/u, "").replaceAll("**", ""), 80)
      || (last?.role === "assistant" && (last.stopReason === "error" || last.stopReason === "aborted")
        ? last.stopReason : "");
    state.now = "";
    void publish();
  });

  omp.on("before_agent_start", async (event, ctx) => {
    if (ctx?.agent?.kind === "sub") return;
    // shortcut: skill-expanded prompts may start with a header; use structured task text when available.
    state.task = oneLine(event.prompt.split(/[\r\n]/u).find((line) => line.trim()) ?? "", 80);
    state.now = state.did = "";
    void publish();
    try {
      const { stdout } = await run(process.env.HERDR_BIN || "herdr", ["agent", "list"], RUN_OPTIONS);
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
      const current = new Map<string, string>();
      const lines: string[] = [];
      let changed = 0;
      for (const agent of neighbors) {
        const status = agent.agent_status === "done" ? "idle" : agent.agent_status;
        const task = agent.agent === "omp" && typeof agent.tokens?.task === "string" ? agent.tokens.task : "";
        const did = agent.agent === "omp" && typeof agent.tokens?.did === "string" ? agent.tokens.did : "";
        const key = JSON.stringify([agent.agent, agent.cwd, agent.name ?? "", status, task, did]);
        current.set(agent.pane_id, key);
        if (sent?.get(agent.pane_id) === key) continue;
        changed++;
        if (changed > 12) continue;
        const inHome = agent.cwd.startsWith(home)
          && (agent.cwd.length === home.length || agent.cwd[home.length] === "/" || agent.cwd[home.length] === "\\");
        const cwd = inHome ? `~${agent.cwd.slice(home.length)}` : agent.cwd;
        const title = agent.terminal_title_stripped.replace(/^(?:π\s+)?[^\p{L}\p{N}\s]+\s+/u, "");
        lines.push(
          `${clean(agent.pane_id, 40)}${agent.name ? `(${clean(agent.name, 32)})` : ""}`
          + ` ${clean(agent.agent, 20)} ${clean(status, 20)} ${clean(cwd, 80)} | ${clean(title, 40)}`
          + (task ? ` | asked: ${clean(task, 80)}` : "")
          + (status === "idle" && did ? ` | did: ${clean(did, 80)}` : ""),
        );
      }
      if (changed > 12) lines.push(`+${changed - 12} more${sent ? " changed" : ""}`);
      if (sent) {
        for (const pane of sent.keys()) {
          if (!current.has(pane)) lines.push(`${clean(pane, 40)} gone`);
        }
      } else if (!neighbors.length) {
        lines.push("No other agents.");
      }
      const full = sent === undefined;
      sent = current;
      if (!lines.length) return;
      const content = ["<herdr-neighbors>", ...(full ? GUIDE : []), ...lines, "</herdr-neighbors>"].join("\n");
      return { message: { customType: "herdr-neighbors", content, display: false } };
    } catch {
      return;
    }
  });
}
