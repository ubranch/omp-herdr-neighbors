# herdr neighbors

An OMP extension that tells the agent which other Herdr agents are running.
It adds a hidden `<herdr-neighbors>` message before the first user turn,
including pane IDs, names, agent kinds, statuses, directories, titles, and CLI basics.
The current pane is excluded. Agents in the current workspace come first.

One TypeScript file. No runtime dependencies. Targets OMP **18.8.7** and
Herdr **0.9.5**.

## install

Copy the file from this repository into OMP's extension directory:

```sh
mkdir -p ~/.omp/agent/extensions
cp ./herdr-neighbors.ts ~/.omp/agent/extensions/herdr-neighbors.ts
```

Or link it instead of copying:

```sh
ln -s "$PWD/herdr-neighbors.ts" ~/.omp/agent/extensions/herdr-neighbors.ts
```

PowerShell copy:

```powershell
New-Item -ItemType Directory -Force "$HOME/.omp/agent/extensions" | Out-Null
Copy-Item ./herdr-neighbors.ts "$HOME/.omp/agent/extensions/herdr-neighbors.ts"
```

Fully exit and restart OMP inside Herdr. No build or dependency installation
is needed to use the copied file.

The extension activates only when `HERDR_ENV=1`, `HERDR_PANE_ID` is set, and
`OMPCODE` is not `1`. Nested OMP processes launched from an agent's shell stay
disabled so they do not impersonate the pane's main agent.

It uses `herdr` from `PATH`. The optional `HERDR_BIN` environment variable
selects an executable path, not a shell command.

## injected context

Example, not a live session recording:

```text
<herdr-neighbors>
- pane_id="w1:p2" name="reviewer" kind="claude" status="idle" cwd="C:/review" title="Review changes"
herdr agent read <pane> --source recent-unwrapped --lines 120
herdr agent get <pane>
herdr agent prompt <target> "..." --wait --timeout 120000
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
Read freely; prompt/send-keys/close only when the user asks.
</herdr-neighbors>
```

The message is hidden from the chat display, not from the model.
It includes metadata, not terminal output. Directories and titles can contain
private information; the configured model provider receives this context.

## refresh and token cost

Before each user turn, the extension runs `herdr agent list` without a shell.
It injects context on the first successful read, when another agent's pane ID,
kind, directory, name, or **status** changes, or after **10 user turns** since
the previous injection. Each injection resets that turn counter.
Title-only, focus-only, and CLI response-order changes do not cause an early
injection. A periodic refresh includes the latest titles.

The list is capped at 12 agents, followed by `+N more` when needed.
Each displayed metadata field is capped at 160 characters, kept on one line,
and escaped so it cannot close the context block.

Unchanged turns do not add another message until the tenth turn.
Existing messages still occupy context and can count toward input tokens;
this extension does not remove them or guarantee a token-cost reduction.

A missing binary, nonzero exit, two-second timeout, malformed response, or
invalid agent entry produces no message and does not interrupt OMP.
A failed read does not reset the refresh counter.

## safety

**Read freely; prompt/send-keys/close only when the user asks.**

This is guidance for the agent, not a permission-enforcement mechanism.
The extension itself only lists agents. It does not read terminal output,
prompt agents, send keys, change focus, or close panes.

## development

Requires Bun. Development dependencies use exact versions from the sibling
`omp-cache-control` repository.

```sh
bun install
bun run typecheck
bun run test
```

Tests load the actual extension, capture its OMP hook, and execute a native
fake `herdr` first on `PATH`. Bun compiles the small fixture script so both
Windows and Linux exercise real no-shell executable lookup. The timeout test
blocks that subprocess until the operating system terminates it.
CI runs the same checks on Ubuntu and Windows.

## license

MIT, copyright 2026 ubranch.
