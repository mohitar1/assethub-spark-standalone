# Experience Catalyst Setup

## Purpose

- Install and verify the Experience Catalyst plugin used for design matching.
- This is operator/agent-host setup, not customer setup.
- Do not put machine-specific paths, Bedrock tokens, or generated settings into
  the project repo.

## Check First

- Inside Claude Code:

```text
/plugin list
```

- From a shell where Claude Code is installed:

```bash
claude plugin list
claude skill list
```

- Continue only when `excat@excat-marketplace` is installed/enabled and
  `excat-complete-design-expert` is invokable in the current session.

## Agent-First Install

- Use an existing local clone if present.
- If no clone exists, clone the Experience Catalyst repo to an operator-owned
  local path.
- Example:

```bash
EXCAT_REPO="${EXCAT_REPO:-$HOME/src/aem-experience-catalyst}"
test -d "$EXCAT_REPO/.git" || git clone https://github.com/Adobe-AEM-Foundation/aem-experience-catalyst.git "$EXCAT_REPO"
cd "$EXCAT_REPO/resources/plugins/aem-excat-plugin/excat-marketplace"
npm run install:all
cd excat/tools/excatops-mcp
npx .
```

- Stop `npx .` after it starts successfully.
- Resolve the absolute marketplace path:

```bash
cd "$EXCAT_REPO"
pwd
```

- The marketplace path is:

```text
<absolute-path-to-aem-experience-catalyst>/resources/plugins/aem-excat-plugin/excat-marketplace
```

## Claude Code Install

- In Claude Code:

```text
/plugin marketplace add <absolute-path-to-aem-experience-catalyst>/resources/plugins/aem-excat-plugin/excat-marketplace
/plugin install excat@excat-marketplace
/plugin list
```

- If the plugin is installed but not enabled:

```text
/plugin enable excat@excat-marketplace
```

- Restart Claude Code if the skill list does not update immediately.
- Recheck:

```text
/plugin list
```

```bash
claude skill list
```

## Claude Code Prereqs

- Node 20 or newer.
- Claude Code 2.0.15 or newer.
- If the environment uses AWS Bedrock, configure credentials only in the
  operator's user-home Claude settings. Do not add Bedrock tokens to this repo.

## Hard Rule

- A source website URL is enough input for design matching.
- Do not ask the user for colors or palette while Catalyst is available.
- Do not treat a generic WebFetch failure as a blocker.
- Do not route this work to DesignSync.
