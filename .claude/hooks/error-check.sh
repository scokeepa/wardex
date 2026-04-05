#!/bin/bash
# PostToolUse hook: Run eslint after file edits (lightweight)
# tsc is handled by Stop hook for full project verification
# Prettier is handled by separate async hook

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check TypeScript/TSX files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# ESLint check with auto-fix + JSON output for rule extraction
ESLINT_JSON=$(npx eslint --fix --format json "$FILE_PATH" 2>/dev/null)
ESLINT_EXIT=$?

# Extract violated rule IDs from JSON output
RULE_IDS=""
if [ $ESLINT_EXIT -ne 0 ] && [ -n "$ESLINT_JSON" ]; then
  RULE_IDS=$(echo "$ESLINT_JSON" | jq -r '.[0].messages[]?.ruleId // empty' 2>/dev/null | sort -u | paste -sd ',' -)
  # Show errors to user
  echo "ESLint errors in $FILE_PATH:"
  echo "$ESLINT_JSON" | jq -r '.[0].messages[]? | "  \(.line):\(.column) \(.severity == 2 | if . then "error" else "warning" end) \(.message) (\(.ruleId))"' 2>/dev/null | head -10
fi

# Build message with rule names
MSG="eslint exit=$ESLINT_EXIT"
if [ -n "$RULE_IDS" ]; then
  MSG="eslint exit=$ESLINT_EXIT $RULE_IDS"
fi

# Log event for timeline
LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/hook-log.jsonl"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"PostToolUse\",\"tool\":\"Edit|Write\",\"file\":\"$FILE_PATH\",\"result\":\"$([ $ESLINT_EXIT -eq 0 ] && echo pass || echo error)\",\"message\":\"$MSG\"}" >> "$LOG_FILE"

exit 0
