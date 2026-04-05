# Claude Code 훅 설정 상세

> SSOT: 각 스크립트의 동작 설명과 설계 결정 기록
> 훅 구성의 실제 값은 `.claude/settings.json`이 원본 (C2: 이 문서는 설명 문서이지 설정 복제가 아님)

## 훅 구성 원본

> **SSOT**: `.claude/settings.json` 파일이 유일한 원본. 아래 매트릭스는 가독성을 위한 요약이며, 불일치 시 settings.json이 우선.
> 마지막 동기화: 2026-04-03

| 이벤트             | 매처          | 타입    | if 필드            | async  | 스크립트/명령          | 역할                    |
| ------------------ | ------------- | ------- | ------------------ | ------ | ---------------------- | ----------------------- |
| PostToolUse        | `Edit\|Write` | command | -                  | -      | `error-check.sh`       | eslint --fix            |
| PostToolUse        | `Edit\|Write` | command | -                  | `true` | `prettier --write`     | 포맷팅 (비블로킹)       |
| PostToolUseFailure | -             | command | -                  | `true` | `log-event.sh failure` | 실패 이벤트 기록        |
| PreToolUse         | `Edit\|Write` | command | -                  | -      | `protect-files.sh`     | 보호 파일 차단          |
| PreToolUse         | `Bash`        | command | `Bash(rm *)`       | -      | `danger-guard.sh`      | 위험 rm 차단            |
| PreToolUse         | `Bash`        | command | `Bash(git push *)` | -      | `danger-guard.sh`      | force push 차단         |
| Stop               | -             | agent   | -                  | -      | tsc + vitest 검증      | 완료 전 전체 검증       |
| SessionStart       | `compact`     | command | -                  | -      | echo 규칙              | 컨텍스트 압축 후 재주입 |

## 스크립트 상세

### error-check.sh

- **트리거**: 파일 수정 후 (PostToolUse)
- **동작**: `.ts`/`.tsx` 파일만 대상, `eslint --fix` 실행
- **출력**: 에러 시 stdout으로 Claude에 피드백 (additionalContext)
- **로그**: `hook-log.jsonl`에 결과 append
- **설계 결정**: tsc 제거 — 전체 프로젝트 타입체크는 Stop agent에서 (감사 결과 #2)

### protect-files.sh

- **트리거**: 파일 수정 전 (PreToolUse)
- **동작**: `.env`, `package-lock.json`, `.git/`, `node_modules/` 등 보호
- **차단**: exit code 2 + stderr 메시지
- **로그**: 차단 시 `hook-log.jsonl`에 기록

### danger-guard.sh

- **트리거**: Bash 명령 전 (PreToolUse), `if` 필드로 rm/git push만
- **동작**: `rm -rf /`, `DROP TABLE`, `git push --force origin main` 등 패턴 매칭
- **차단**: exit code 2 + stderr 메시지
- **설계 결정**: `if` 필드로 사전 필터링 — 안전한 명령은 스크립트 실행 자체를 스킵 (감사 결과 #3)

### log-event.sh

- **트리거**: 도구 실행 실패 (PostToolUseFailure)
- **동작**: stdin JSON에서 tool_name, file_path 추출 → `hook-log.jsonl`에 append
- **async**: true (비블로킹)

### Stop agent

- **트리거**: Claude 작업 완료 시
- **동작**: `$ARGUMENTS`로 입력 JSON 수신, `stop_hook_active` 체크 후 tsc + vitest 실행
- **무한루프 방지**: `stop_hook_active=true`면 즉시 `{ok: true}` 반환 (감사 결과 #1)
- **타임아웃**: 120초

## hook-log.jsonl 스키마

```json
{
  "timestamp": "2026-04-03T00:00:00Z",
  "event": "PreToolUse | PostToolUse | PostToolUseFailure | Stop",
  "tool": "Edit|Write | Bash",
  "file": "/path/to/file or command text",
  "result": "pass | block | error | failure",
  "message": "human-readable description"
}
```

## 엣지케이스 & 대응

### EC-1: hook-log.jsonl 무한 성장

- **문제**: 로테이션 없이 append만 하면 디스크/파싱 성능 저하
- **대응**: main process에서 파일 크기 체크 (1MB 초과 시 오래된 절반 삭제), 또는 최대 5000줄 유지

### EC-2: hook-log.jsonl 동시 쓰기 경합

- **문제**: 여러 훅이 병렬 실행되면 같은 파일에 동시 append → 라인 깨짐
- **대응**: `flock`(macOS에선 불안정)보다 **각 스크립트가 개별 임시 파일에 쓰고, log-event.sh가 단일 스레드로 병합**. 또는 `>> file`의 원자성(POSIX에서 작은 쓰기는 원자적)에 의존하되, 라인 파싱 시 깨진 줄은 스킵 (EC-21 참조)

### EC-3: jq 미설치

- **문제**: 모든 sh 스크립트가 `jq` 의존, 미설치 시 전체 훅 실패
- **대응**:
  - SessionStart 훅에 `which jq || echo "WARNING: jq not installed. Install with: brew install jq"` 추가
  - 또는 jq 대신 `node -e` 폴백: `node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).tool_input.file_path)"`

### EC-4: npx 콜드 스타트 지연

- **문제**: 첫 실행 시 npx가 패키지 resolve에 2-5초 소요
- **대응**: package.json scripts에 eslint/prettier를 등록하고 `npm run lint:file -- $FILE` 형태로 호출, 또는 `./node_modules/.bin/eslint` 직접 경로 사용

## 환경 변수

| 변수                 | 제공자      | 용도                                |
| -------------------- | ----------- | ----------------------------------- |
| `CLAUDE_PROJECT_DIR` | Claude Code | 프로젝트 루트 경로                  |
| `$ARGUMENTS`         | Claude Code | Stop/prompt 훅에 전달되는 입력 JSON |
