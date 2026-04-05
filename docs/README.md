# Wardex 문서 인덱스

> 4-Layer 에러 자동화 시스템 — React + TypeScript + Electron
> 각 문서는 하나의 책임만 가짐 (SRP). 정보 중복 없이 단일 출처 유지 (SSOT).

## 현재 상태

- **Phase 1**: 완료 (4-Layer 자동화 + 소스 감사 수정)
- **Phase 2**: 미착수 (대시보드 UI — 3단계 분할)

## Architecture — 시스템 설계

| 문서                                                    | 책임                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| [4-layer-overview.md](architecture/4-layer-overview.md) | 4-Layer 구조, 데이터 흐름, 설계 원칙, 파일 맵                     |
| [hooks-config.md](architecture/hooks-config.md)         | Claude Code 훅 스크립트 동작 설명 (원본: `.claude/settings.json`) |
| [ipc-contract.md](architecture/ipc-contract.md)         | Electron IPC 채널, 페이로드, 타입, Preload API                    |

## Pipeline — 구현 파이프라인

| 문서                                                                  | 책임                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| [phase-2a-foundation.md](pipeline/phase-2a-foundation.md)             | Stage 1~4: 기반 설정 + 공통 컴포넌트 + Settings + Dashboard |
| [phase-2b-local-monitoring.md](pipeline/phase-2b-local-monitoring.md) | Stage 5~6: 로그 뷰어 + 타임라인                             |
| [phase-2c-external.md](pipeline/phase-2c-external.md)                 | Stage 7~8: Sentry 연동 + 최종 검증                          |

## Specs — 페이지별 구현 스펙

| 문서                                       | 책임                                       |
| ------------------------------------------ | ------------------------------------------ |
| [dashboard.md](specs/dashboard.md)         | /dashboard — Layer 상태 + 헬스 + 퀵 액션   |
| [log-viewer.md](specs/log-viewer.md)       | /logs — 실시간 에러 로그 뷰어              |
| [sentry-viewer.md](specs/sentry-viewer.md) | /sentry — Sentry REST API 이슈/이벤트 뷰어 |
| [timeline.md](specs/timeline.md)           | /timeline — 훅 이벤트 타임라인             |
| [settings.md](specs/settings.md)           | /settings — 설정 관리                      |

## Audit — 감사 & 검증

| 문서                                                           | 책임                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [source-audit-2026-04-03.md](audit/source-audit-2026-04-03.md) | Claude Code 원본 소스 감사 (허점 3건 + 개선 7건)     |
| [simulation-2026-04-03.md](audit/simulation-2026-04-03.md)     | 시뮬레이션 13건 + 비판적 검증 14건 + 엣지케이스 29건 |

## References — 외부 참조

| 문서                                | 책임                    |
| ----------------------------------- | ----------------------- |
| [sources.md](references/sources.md) | 리서치 출처 링크 (SSOT) |

## 구현 순서

```
Phase 2a ──→ Phase 2b ──→ Phase 2c
 Stage 1: 기반   Stage 5: /logs     Stage 7: /sentry
 Stage 2: 공통   Stage 6: /timeline Stage 8: 최종 검증
 Stage 3: /settings
 Stage 4: /dashboard
```
