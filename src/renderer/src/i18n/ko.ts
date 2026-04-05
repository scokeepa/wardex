export const ko = {
  // Common
  app: { name: 'Wardex', checking: '확인 중...', loading: '로딩 중...' },

  // Sidebar
  nav: {
    dashboard: '대시보드',
    logs: '로그',
    timeline: '타임라인',
    sentry: 'Sentry',
    patterns: '패턴',
    settings: '설정',
  },

  // Dashboard
  dashboard: {
    title: '대시보드',
    layers: '레이어',
    systemHealth: '시스템 헬스',
    quickActions: '퀵 액션',
    l1: 'L1 Claude Code',
    l1Desc: '코드 작성 시 실시간 에러 감지 + 자동 수정',
    l2: 'L2 Git 훅',
    l2Desc: '커밋/푸시 전 lint + 타입체크 + 테스트 게이트',
    l3: 'L3 CI/CD',
    l3Desc: 'PR 시 자동 검증 (lint → typecheck → test → build)',
    l4: 'L4 Sentry',
    l4Desc: '프로덕션 런타임 에러 수집 + 세션 리플레이',
    hooks: '개 훅',
    preCommit: 'pre-commit',
    prePush: 'pre-push',
    configured: '설정됨',
    notConfigured: '미설정',
    connected: '연결됨',
    notConnected: '미연결',
    unresolved: '개 미해결',
    errors: '개 에러',
    warnings: '개 경고',
    passed: '통과',
    clean: '클린',
    dirty: '변경됨',
    typeCheck: '타입 체크',
    typeCheckTip: 'TypeScript 타입 에러를 검사합니다 (tsc --noEmit)',
    lintFix: '린트 수정',
    lintFixTip: '변경된 파일의 ESLint 규칙 위반을 자동 수정합니다',
    runTests: '테스트 실행',
    runTestsTip: 'Vitest 단위 테스트를 실행합니다',
    formatAll: '포맷 검사',
    formatAllTip: '변경된 파일의 코드 스타일을 Prettier로 검사합니다',
    running: '실행 중...',
    success: '성공',
    failed: '실패',
    notAvailable: '사용 불가',
  },

  // Status
  status: { active: '활성', inactive: '비활성', error: '에러' },

  // Logs
  logs: {
    title: '로그',
    search: '검색 (정규식)...',
    autoScroll: '자동 스크롤',
    on: 'ON',
    off: 'OFF',
    entries: '항목',
    noLogs: '아직 로그가 없습니다. 이벤트 대기 중...',
    noMatch: '현재 필터에 일치하는 로그가 없습니다.',
    invalidRegex: '잘못된 정규식',
    showStack: '스택 보기',
    hideStack: '스택 숨기기',
  },

  // Timeline
  timeline: {
    title: '타임라인',
    allEvents: '전체 이벤트',
    allResults: '전체 결과',
    noEvents: '아직 훅 이벤트가 없습니다.',
    noMatch: '현재 필터에 일치하는 이벤트가 없습니다.',
    loadMore: '더 보기...',
    events: '개 이벤트',
  },

  // Sentry
  sentry: {
    title: 'Sentry',
    placeholder: '수집된 이슈가 없습니다',
  },

  // About
  about: {
    title: '정보',
    tagline: '4-Layer 에러 자동화 시스템',
    description:
      'wardex는 개발 시점부터 프로덕션까지 에러를 자동으로 감지, 차단, 추적하는 Electron 기반 대시보드입니다. Claude Code 훅, Git 훅, CI/CD, Sentry를 4개 레이어로 통합하여 코드 품질을 실시간으로 관리합니다.',
    layers: {
      title: '4-Layer 아키텍처',
      l1: 'Layer 1 — Claude Code 훅: 코드 작성 즉시 ESLint 자동 수정, 위험 명령 차단, 보호 파일 감시',
      l2: 'Layer 2 — Git 훅: 커밋 전 lint-staged, 푸시 전 타입체크 + 테스트 게이트',
      l3: 'Layer 3 — CI/CD: PR 생성 시 GitHub Actions로 lint → typecheck → test → build 자동 검증',
      l4: 'Layer 4 — Sentry: 프로덕션 런타임 에러 수집, 스택 트레이스, 세션 리플레이',
    },
    version: '버전',
    developer: '개발자',
    github: 'GitHub',
    license: '라이선스',
    techStack: '기술 스택',
  },

  // Patterns
  patterns: {
    title: '패턴',
    errorPatterns: '에러 패턴',
    hotFiles: '핫 파일',
    suggestions: '제안',
    file: '파일',
    type: '유형',
    count: '횟수',
    trend: '트렌드',
    lastSeen: '최근 발생',
    noPatterns: '아직 감지된 에러 패턴이 없습니다.',
    noHotFiles: '핫 파일이 없습니다.',
    noSuggestions: '제안 사항이 없습니다.',
    applyRule: 'CLAUDE.md에 적용',
    dismiss: '무시',
    applied: '적용됨',
    errors: '에러',
    blocks: '차단',
    events: '이벤트',
    patternsDetected: '개 에러 패턴 감지',
    suggestionsAvailable: '개 제안 대기',
  },

  // Sidebar (about)
  nav_about: '정보',

  // Settings
  settings: {
    title: '설정',
    saved: '저장됨',
    saveFailed: '저장 실패',
    sentrySection: 'Sentry',
    dsn: 'DSN',
    dsnHelp: '프로젝트 선택 → Client Keys (DSN) → DSN 값 복사 → 여기에 붙여넣기',
    authToken: '인증 토큰',
    authTokenHelp:
      'Settings → Account → API → Auth Tokens → Create New Token → project:read, event:read 권한 선택 → 생성된 토큰 복사',
    organization: '조직',
    orgHelp: 'Settings → Organization → General Settings → Organization Slug 값 복사',
    project: '프로젝트',
    projectHelp: 'Settings → Projects → 프로젝트 선택 → Name 또는 URL slug 값',
    uiSection: 'UI',
    darkMode: '다크 모드',
    logBufferSize: '로그 보관 개수',
    language: '언어',
    hookStatus: '훅 상태',
    hookRegistered: '.claude/settings.json에 등록됨',
  },
} as const
