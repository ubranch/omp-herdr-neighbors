<div align="center">

<img src="./assets/readme/hero.svg" width="100%"
     alt="herdr neighbors, an omp extension. The current omp pane receives a hidden herdr-neighbors block that lists two other Herdr agents: w1:p2 reviewer, claude, idle; w1:p3, codex, working. Illustrated example.">

<p>
<img src="https://img.shields.io/badge/typescript-1E1E22?style=flat-square" alt="TypeScript">
<img src="https://img.shields.io/badge/omp_18.8.7-1E1E22?style=flat-square" alt="Compatibility target: omp 18.8.7">
<img src="https://img.shields.io/badge/herdr_0.9.5-1E1E22?style=flat-square" alt="Compatibility target: herdr 0.9.5">
<img src="https://img.shields.io/badge/0_runtime_deps-1E1E22?style=flat-square" alt="No runtime dependencies">
<img src="https://img.shields.io/badge/36_tests-1E1E22?style=flat-square" alt="36 tests">
<a href="#install"><img src="https://img.shields.io/badge/install-F97316?style=flat-square&labelColor=1E1E22" alt="Install"></a>
</p>

</div>

**Herdr Neighbors** is an omp extension that tells the agent which other Herdr
agents run beside it. Before a user turn, it adds a hidden `<herdr-neighbors>`
block: pane IDs, names, agent kinds, statuses, directories, and titles.
The current pane is excluded. Agents in the current workspace come first.

**It works in running chats too: the list refreshes on change, not every turn.**

## install

Use omp's native GitHub plugin installer:

```sh
omp plugin install github:ubranch/omp-herdr-neighbors
```

Or copy the file into omp's extension directory:

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
Line format: pane[(name)] kind status cwd | title
Read: herdr agent read <pane> --source recent-unwrapped --lines 120
Prompt, send-keys or close other panes only when the user asks.
w1:p2(reviewer) claude idle C:/review | Review changes
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

The first block of a session carries a three-line guide. Later blocks carry
only the agent lines. The list is capped at 12 agents, then `+N more`.
Titles are cut at 60 characters and directories at 160. Every field is kept
on one line and escaped so it cannot close the context block.

Unchanged turns do not add another message until the tenth turn.
Existing messages still occupy context and can count toward input tokens;
this extension does not remove them or guarantee a token-cost reduction.

A missing binary, nonzero exit, two-second timeout, or malformed response
produces no message and does not interrupt omp. Invalid agent entries are
skipped; valid neighbors still show.
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
