# Changelog

## 0.1.0 — 2026-10-15

- Add hidden Herdr neighbor context through OMP's `before_agent_start` hook, with own-pane exclusion, current-workspace ordering, a 12-agent limit, and CLI basics.
- Inject on the first successful read, on pane/kind/directory/name/status changes, and every 10 user turns since the previous injection. Ignore title-only and focus-only churn.
- Gate on the main Herdr pane agent and fail silently on CLI, timeout, JSON, or schema errors. Bound and escape displayed metadata.
- Add executable-boundary tests, exact development dependency pins, Windows/Linux CI, and copy/symlink installation instructions.
