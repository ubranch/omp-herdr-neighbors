# Changelog

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
