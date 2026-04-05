# Phase 2b: 로컬 모니터링

> 책임: 실시간 로그 뷰어 + 훅 이벤트 타임라인
> 선행 조건: Phase 2a 완료 (기반 + Settings + Dashboard)
> 산출물: 로그 스트림 + 타임라인 실시간 동작

## Stage 5: /logs (실시간 에러 로그 뷰어)

### 스펙 참조

→ `specs/log-viewer.md`
→ `architecture/ipc-contract.md` — `log:push` 채널

### 데이터 흐름

```
electron-log (main process)
  │ console.error/warn/info/debug 인터셉트
  │ log.hooks.push() → formatLogEntry()
  ▼
BrowserWindow.getAllWindows().forEach(win =>    ← S10: 다중 창 broadcast
  win.webContents.send('log:push', entry)
)
  ▼
renderer: onLogMessage(callback)
  │ ring buffer (max: settings.logBufferSize)
  ▼
LogViewer.tsx 렌더링
```

### hook 로그 주입 (D3 수정)

Claude Code가 훅 stdout/stderr를 소비하므로 직접 캡처 불가.
대신: chokidar가 hook-log.jsonl 변경 감지 → 새 줄을 `source: 'hook'` LogEntry로 변환 → `log:push`

### 구현 포인트

| 항목                | 구현                                       | EC/S 참조 |
| ------------------- | ------------------------------------------ | --------- |
| electron-log 초기화 | `log.initialize({ preload: false })`       | S5        |
| 로그 broadcast      | `getAllWindows().forEach`                  | S10       |
| Ring buffer         | 최대 1000개 (settings 연동)                | -         |
| 가상 스크롤         | 화면에 보이는 항목만 DOM 렌더링            | EC-13     |
| 배치 렌더링         | `requestAnimationFrame` 16ms마다 최대 50개 | EC-13     |
| 정규식 검색         | `new RegExp()` try-catch → 문자열 폴백     | EC-14     |
| ANSI strip          | `message.replace(/\x1b\[[0-9;]*m/g, '')`   | EC-29     |
| 자동 스크롤         | 기본 ON, 위로 스크롤 시 OFF                | -         |

### 새 파일

| 파일                                   | 역할             |
| -------------------------------------- | ---------------- |
| `src/renderer/src/pages/LogViewer.tsx` | 로그 뷰어 페이지 |

### 검증

```bash
npm run dev
# → /logs 페이지 열기
# → console.error('test') → 로그 스트림에 즉시 표시
# → 레벨 필터(error만) → error만 표시
# → 소스 필터(hook) → hook 이벤트만 표시
# → 검색 → 매칭 항목 하이라이트
# → 잘못된 regex 입력 → "Invalid regex" 경고, 크래시 없음
npx tsc --noEmit && npx eslint src/ && npx vitest run
```

---

## Stage 6: /timeline (훅 이벤트 타임라인)

### 스펙 참조

→ `specs/timeline.md`
→ `architecture/ipc-contract.md` — `hooks:get-events`, `hook:event` 채널
→ `architecture/hooks-config.md` — hook-log.jsonl 스키마

### 데이터 흐름

```
[초기 로드]
  renderer → IPC 'hooks:get-events' → main
  main: fs.readFile('hook-log.jsonl')
        .split('\n')
        .filter(Boolean)          ← S8: 빈 줄 필터
        .map(line => {
          try { return JSON.parse(line) }
          catch { return null }   ← EC-21: 깨진 줄 스킵
        })
        .filter(Boolean)
  → HookEvent[] 반환

[실시간]
  chokidar.watch('hook-log.jsonl')
  → 변경 감지 → 마지막 읽기 위치 이후 새 줄 파싱
  → IPC 'hook:event' → getAllWindows broadcast
```

### 구현 포인트

| 항목        | 구현                                            | EC/S 참조 |
| ----------- | ----------------------------------------------- | --------- |
| JSONL 파싱  | `.filter(Boolean)` + 라인별 try-catch           | S8, EC-21 |
| 실시간 감시 | chokidar (not fs.watch)                         | A2, S11   |
| 시간대 변환 | UTC → `toLocaleTimeString()`, 호버 시 UTC       | EC-22     |
| 파일 부재   | 빈 배열 반환, "아직 이벤트 없음" 표시           | EC-23     |
| 대량 이벤트 | 기본 200개, "더 보기" 버튼                      | EC-24     |
| 색상 코드   | pass=녹색, block=빨강, error=노랑, failure=주황 | -         |

### 새 파일

| 파일                                  | 역할            |
| ------------------------------------- | --------------- |
| `src/renderer/src/pages/Timeline.tsx` | 타임라인 페이지 |

### 검증

```bash
npm run dev
# → /timeline 페이지 열기
# → 이전 훅 이벤트 목록 표시 확인
# → Claude Code에서 파일 수정 → 타임라인에 새 이벤트 실시간 추가 확인
# → 필터(PreToolUse만) → 해당 이벤트만 표시
# → hook-log.jsonl 삭제 → "아직 이벤트 없음" 표시
npx tsc --noEmit && npx eslint src/ && npx vitest run
```

---

## Phase 2b 완료 기준

- [ ] /logs: 실시간 로그 스트림 동작 (main + renderer + hook 소스)
- [ ] /logs: 레벨/소스 필터 + 검색 동작
- [ ] /logs: 로그 폭주 시 프레임 드롭 없음 (가상 스크롤)
- [ ] /timeline: hook-log.jsonl 기반 이벤트 목록 표시
- [ ] /timeline: chokidar 실시간 업데이트 동작
- [ ] /timeline: 필터 + 시간대 로컬 변환 동작
- [ ] `tsc --noEmit` 0 에러, `eslint src/` 0 에러, `vitest run` 전체 통과
