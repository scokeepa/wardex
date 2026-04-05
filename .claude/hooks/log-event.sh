#!/bin/bash
# Generic hook event logger — appends to hook-log.jsonl
# Usage: log-event.sh <event_type>
# Reads hook JSON from stdin

EVENT_TYPE="${1:-unknown}"
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty' | head -c 200)
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')

LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/hook-log.jsonl"

echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"${HOOK_EVENT:-$EVENT_TYPE}\",\"tool\":\"$TOOL_NAME\",\"file\":\"$FILE_PATH\",\"result\":\"$EVENT_TYPE\",\"message\":\"tool $EVENT_TYPE\"}" >> "$LOG_FILE"

exit 0
