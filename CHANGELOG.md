# Changelog

## 0.5.0 — 2026-10-16

- Warn before edit/write/ast_edit when another live pane recently edited the same file; record successful edits atomically with bounded retention and ignore subagents, non-file schemes, and file errors. Keep task text out of edit records and trusted guard guidance.
- Add `herdr_await` for event-driven pane completion messages, with per-pane deduplication, current status reads, bounded waits, and silent cancellation on session switch or shutdown.
- Lowercase the entire `now` and `did` beacon values with `toLocaleLowerCase()` before publishing; preserve `task` casing.
- Document edit-guard limits, measured tool-schema token cost, Herdr sidebar rows, and existing completion toasts.

## 0.4.0 — 2026-10-16

- Remove Claude Code and Codex transcript reading; asked/did come only from omp beacons.
- Take the beacon task only from typed input, so extension-sent prompts such as review-gate retries no longer replace it.

## 0.3.0 — 2026-10-16

- Filter task text: skip short/noisy prompts and bare commands; drop leading `[Image #N]` placeholders; extract slash-command arguments and OMP skill-template user arguments without replacing a useful task with invocation boilerplate.
- Choose useful reply lines instead of colon headings, table rows, or code fences, with the first cleaned line as fallback.
- Read Claude Code and Codex asked/did text from local JSONL transcripts using absolute paths or cached session-ID lookups, environment overrides, parallel incremental reads bounded to 1 MiB, and per-pane failure isolation.
- Ignore hidden working-reply changes in delta keys. Treat asked/did text as data, not instructions, in the injected safety guide.
- Expand executable-boundary tests and document transcript locations, filters, privacy, and remeasured token costs.

## 0.2.0 — 2026-10-16

- Send the full neighbor list and four-line guide once, then only new or changed lines and closed-pane notices. Unchanged turns never add a message; title-only changes do not trigger a delta.
- Publish this pane's task, live tool intent, and last reply through a zero-model-call Herdr metadata beacon. Trust task/reply tokens only from OMP panes and show replies only while idle.
- Exclude subagents from every hook. Reset the full-list state on compaction, session switch, branch, and tree navigation; clear beacon tokens on session start and session switch.
- Keep metadata on one line. Cap titles at 40 characters, directories at 80, tasks and replies at 80 (Herdr's token value limit), live intents at 60; shorten home directories to `~` and escape `<`.
- Normalize `done` to `idle`, retain the 12-neighbor limit, and cap deltas at 12 changed lines plus closed-pane notices.

## 0.1.0 — 2026-10-15

- Add hidden Herdr neighbor context through OMP's `before_agent_start` hook, with own-pane exclusion, current-workspace ordering, a 12-agent limit, and CLI basics.
- Inject on the first successful read, on pane/kind/directory/name/status changes, and every 10 user turns since the previous injection. Ignore title-only and focus-only churn.
- Gate on the main Herdr pane agent and fail silently on CLI, timeout, JSON, or schema errors. Bound and escape displayed metadata.
- Compact one-line agent format; the CLI guide is sent once per session (about 30% fewer characters per block).
- Skip invalid agent entries instead of dropping the whole list.
- Add executable-boundary tests, exact development dependency pins, Windows/Linux CI, and copy/symlink installation instructions.
