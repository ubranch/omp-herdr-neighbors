<div align="center">

<img src="./assets/readme/hero.svg" width="100%"
     alt="herdr neighbors, an omp extension. The current omp pane receives a hidden herdr-neighbors block with two neighbors: w1:p2, omp, idle, with its task and last reply; w1:p3 reviewer, claude, working. Only changes are sent. Illustrated example.">

<p>
<img src="https://img.shields.io/badge/typescript-1E1E22?style=flat-square" alt="TypeScript">
<img src="https://img.shields.io/badge/omp_18.8.7-1E1E22?style=flat-square" alt="Compatibility target: omp 18.8.7">
<img src="https://img.shields.io/badge/herdr_0.9.5-1E1E22?style=flat-square" alt="Compatibility target: herdr 0.9.5">
<img src="https://img.shields.io/badge/0_runtime_deps-1E1E22?style=flat-square" alt="No runtime dependencies">
<img src="https://img.shields.io/badge/80_tests-1E1E22?style=flat-square" alt="80 tests">
<a href="#install"><img src="https://img.shields.io/badge/install-F97316?style=flat-square&labelColor=1E1E22" alt="Install"></a>
</p>

</div>

**Herdr Neighbors** is an omp extension that tells the agent which other Herdr
agents run beside it. Before a user turn, it adds a hidden `<herdr-neighbors>`
block: pane IDs, names, agent kinds, statuses, directories, and titles.
OMP neighbors can also share what they were asked and what they last did.
The current pane and subagents are excluded. Agents in the current workspace
come first.

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
Other Herdr agents. Line: pane[(name)] kind status cwd | title | asked: last prompt | did: last reply
Later blocks list only changed agents. "gone" means the pane closed.
Live step: herdr agent get <pane> (tokens.now). Output: herdr agent read <pane> --source recent-unwrapped --lines 120
Prompt, send-keys or close other panes only when the user asks.
w1:p2 omp idle ~/api | auth | asked: fix login test | did: 12 tests pass
w1:p3(reviewer) claude working ~/api | Review auth changes
</herdr-neighbors>
```

The first successful read sends the full list and guide.
Later blocks contain only new or changed neighbors, plus `<pane> gone` for
closed panes. Unchanged neighbors produce no message, however many turns pass.
Compaction, session switches, branches, and tree navigation reset the first
full block (`session_compact`, `session_switch`, `session_branch`, `session_tree`).
Every hook ignores subagents (`ctx.agent.kind === 'sub'`).

The list shows at most 12 neighbors, then `+N more`. A delta shows at most
12 changed neighbors, then `+N more changed`, plus any gone panes.
Titles cap at 40 characters and directories at 80, with the home directory
shortened to `~`. All fields stay on one line; `<` becomes `&lt;`.
Title-only changes do not trigger a delta. A `done` status displays as `idle`.

The beacon publishes this pane's `task`, `now`, and `did` tokens to Herdr
metadata under source `omp-herdr-neighbors`. It uses zero model calls:
the prompt sets `task`, tool events update `now`, and the last assistant reply
sets `did`. Session start and session switch clear the three tokens.
Neighbor lines trust task/reply tokens only from OMP panes; `did` appears
only when the neighbor is idle.
`herdr agent get <pane>` and `herdr agent read <pane>` remain pull commands.
The extension adds no LLM tools and never pulls terminal output automatically.

The message is hidden from the chat display, not from the model.
The beacon writes the first nonempty prompt line (at most 80 characters) and
the first nonempty line of the last assistant reply (at most 80 characters)
into Herdr pane metadata. Whitespace is collapsed.
Neighbor agents may send those lines to their model providers.
Directories, titles, and live tool intents can also contain private information.

## token cost

Before each user turn, `herdr agent list` supplies the current metadata.
After the first full block, only pane, kind, directory, name, status, task,
or reply changes add context. Focus, title, and response-order changes do not.
There is no periodic refresh.

The full example above measures **143 tokens**. This one-agent delta measures
**29 tokens**, including the opening and closing tags:

```text
<herdr-neighbors>
w1:p3(reviewer) claude idle ~/api | Review auth changes
</herdr-neighbors>
```

Measured with `uv run --quiet --with tiktoken python`, using `o200k_base`.
This tokenizer is a labeled proxy, not a provider billing measurement.
Unchanged turns add **0 new context tokens**. Earlier messages remain in
context and can still count toward input tokens.

A missing binary, nonzero exit, two-second timeout, or malformed list response
produces no message and does not interrupt omp. Invalid agent entries are
skipped; valid neighbors still show. A failed read preserves the last snapshot.
Beacon writes are fire-and-forget, coalesce to the latest state, and ignore
CLI failures without delaying tool execution.

## safety

**Read freely; prompt/send-keys/close only when the user asks.**

This is guidance for the agent, not a permission-enforcement mechanism.
The extension lists agents and writes its own pane metadata.
It does not read terminal output, prompt agents, send keys, change focus,
or close panes. These instructions do not restrict other tools an agent has.

## development

Requires Bun. Development dependencies use exact versions from the sibling
`omp-cache-control` repository.

```sh
bun install
bun run typecheck
bun run test
```

Tests load the actual extension, capture its OMP hooks, and execute a native
fake `herdr` first on `PATH`. Bun compiles the small fixture script so both
Windows and Linux exercise real no-shell executable lookup. The timeout test
blocks that subprocess until the operating system terminates it.
CI runs the same checks on Ubuntu and Windows.

## license

MIT, copyright 2026 ubranch.
