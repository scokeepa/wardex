#!/bin/bash
# PreToolUse hook: Block dangerous bash commands
# Exit code 2 = block the action
# Note: Only triggered for 'rm *' and 'git push *' via 'if' field in settings.json

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  exit 0
fi

DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf /*"
  "drop table"
  "DROP TABLE"
  "truncate "
  "TRUNCATE "
  ":(){ :|:& };:"
  "mkfs."
  "dd if="
  "> /dev/sda"
  "chmod -R 777 /"
  "git push --force origin main"
  "git push -f origin main"
)

LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/hook-log.jsonl"

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$CMD" == *"$pattern"* ]]; then
    echo "Blocked dangerous command containing '$pattern'. Please use a safer alternative." >&2
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"PreToolUse\",\"tool\":\"Bash\",\"file\":\"\",\"result\":\"block\",\"message\":\"dangerous: $pattern\"}" >> "$LOG_FILE"
    exit 2
  fi
done

exit 0
