# 리서치 출처

> SSOT: 외부 참조 링크. 다른 문서에서는 이 파일을 참조.

## 공식 문서

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) — 훅 설정, 이벤트, 매처, exit code
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — 전체 이벤트 스키마, JSON 출력 포맷
- [Sentry Electron SDK](https://docs.sentry.io/platforms/javascript/guides/electron/) — main/renderer 초기화
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/) — ErrorBoundary, browserTracing
- [Sentry REST API](https://docs.sentry.io/api/events/) — 이슈/이벤트 조회 엔드포인트
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) — ipcMain/ipcRenderer 패턴
- [electron-vite Guide](https://electron-vite.org/guide/) — 프로젝트 구조, 설정

## 라이브러리

- [electron-log](https://github.com/megahertz/electron-log) — Main/Renderer 통합 로깅
- [husky](https://typicode.github.io/husky/) — Git 훅 관리
- [lint-staged](https://github.com/lint-staged/lint-staged) — staged 파일 대상 린트
- [typescript-eslint](https://typescript-eslint.io/) — ESLint flat config + TS

## 참고 프로젝트

- [Claude Code Agent Monitor](https://github.com/hoangsonww/Claude-Code-Agent-Monitor) — WebSocket 실시간 대시보드, Kanban 보드, 세션 추적
- [Claude Code Multi-Agent Observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) — 훅 이벤트 캡처, Bun 서버, Vue 타임라인

## 소스 코드 분석

- Claude Code 원본 소스 (로컬 분석용)
  - `utils/hooks.ts` — 훅 실행 엔진
  - `types/hooks.ts` — 결과 타입
  - `schemas/hooks.ts` — 설정 Zod 스키마
  - `entrypoints/sdk/coreSchemas.ts` — 이벤트 목록, 입력 스키마
  - `query.ts` — Stop 훅 흐름, stopHookActive
