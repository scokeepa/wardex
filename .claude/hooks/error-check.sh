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

# ESLint check with auto-fix
ESLINT_OUTPUT=$(npx eslint --fix "$FILE_PATH" 2>&1)
ESLINT_EXIT=$?

if [ $ESLINT_EXIT -ne 0 ]; then
  echo "ESLint errors in $FILE_PATH:"
  echo "$ESLINT_OUTPUT" | head -20
fi

# Log event for timeline
LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/hook-log.jsonl"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"PostToolUse\",\"tool\":\"Edit|Write\",\"file\":\"$FILE_PATH\",\"result\":\"$([ $ESLINT_EXIT -eq 0 ] && echo pass || echo error)\",\"message\":\"eslint exit=$ESLINT_EXIT\"}" >> "$LOG_FILE"

exit 0
