#!/bin/bash
# PreToolUse hook: Block edits to protected files
# Exit code 2 = block the action

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

PROTECTED_PATTERNS=(
  ".env"
  ".env.local"
  "package-lock.json"
  ".git/"
  "node_modules/"
  "electron-builder.json"
)

LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/hook-log.jsonl"

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: '$FILE_PATH' matches protected pattern '$pattern'. This file should not be edited directly." >&2
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"PreToolUse\",\"tool\":\"Edit|Write\",\"file\":\"$FILE_PATH\",\"result\":\"block\",\"message\":\"protected pattern: $pattern\"}" >> "$LOG_FILE"
    exit 2
  fi
done

exit 0
