# Publish guard hook (`guard-da-publish.sh`)

A `PreToolUse` hook that blocks any Document Authoring / Helix **publish**
whose target path is not under the demo's company folder
(`customer.daFolder` in `.internal/onboarding-state.json`). It enforces
the folder-scoped publish rule from `SKILL.md` Step 4 mechanically.

**Fail-safe:** if no company folder is resolved yet (before Step 3 sets
`customer.daFolder`), every DA/Helix publish write is blocked.

**Scope / limitations (defense-in-depth, not a sandbox):**
- Pattern-based over the tool input — an unusual command shape, or a URL
  built from a variable inside a wrapper script, can slip past. This is
  why `SKILL.md` Step 4 mandates passing the explicit `/<company>/…`
  path list as args (keeps them visible to this hook).
- Sees each CLI-mediated tool call, not iteration inside a long-running
  script — it validates the argv/paths passed in, not paths a script
  generates internally.
- It intentionally does **not** touch AEM asset publishes (Phase C, which
  target `/content/dam/<company>` on a different host) — only site
  content publish/preview via `admin.hlx.page` / `admin.da.live`.

## Registration

This repo registers the hook for Claude Code in `.claude/settings.json`.
Verify it is loaded before a migration session. If another CLI runs the
session, register the same script there.

**Claude Code** — project registration:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/skills/customer-migration/hooks/guard-da-publish.sh"
          }
        ]
      }
    ]
  }
}
```

**Copilot CLI** — register the same script as a `PreToolUse` command hook
via the CLI's hooks configuration (see `/env` to confirm it loaded). The
script reads the event JSON on stdin and blocks with exit code 2, which
both CLIs honor.

## Verifying

```bash
# allow: publish under the company folder
echo '{"tool_input":{"command":"curl -X POST https://admin.hlx.page/preview/o/r/main/disney/x"}}' \
  | CLAUDE_PROJECT_DIR=/path/to/repo ./guard-da-publish.sh; echo "exit=$?"   # 0

# block: publish to a root path
echo '{"tool_input":{"command":"curl -X POST https://admin.hlx.page/live/o/r/main/en/index"}}' \
  | CLAUDE_PROJECT_DIR=/path/to/repo ./guard-da-publish.sh; echo "exit=$?"   # 2
```

Requires `python3` on PATH (used only for JSON parsing).
