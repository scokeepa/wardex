export const en = {
  // Common
  app: { name: 'Wardex', checking: 'Checking...', loading: 'Loading...' },

  // Sidebar
  nav: {
    dashboard: 'Dashboard',
    logs: 'Logs',
    timeline: 'Timeline',
    sentry: 'Sentry',
    settings: 'Settings',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    layers: 'Layers',
    systemHealth: 'System Health',
    quickActions: 'Quick Actions',
    l1: 'L1 Claude Code',
    l1Desc: 'Real-time error detection + auto-fix during coding',
    l2: 'L2 Git Hooks',
    l2Desc: 'Lint + typecheck + test gate before commit/push',
    l3: 'L3 CI/CD',
    l3Desc: 'Auto validation on PR (lint → typecheck → test → build)',
    l4: 'L4 Sentry',
    l4Desc: 'Production runtime error tracking + session replay',
    hooks: ' hooks',
    preCommit: 'pre-commit',
    prePush: 'pre-push',
    configured: 'Configured',
    notConfigured: 'Not configured',
    connected: 'Connected',
    notConnected: 'Not connected',
    unresolved: ' unresolved',
    errors: ' errors',
    warnings: ' warnings',
    passed: ' passed',
    clean: 'clean',
    dirty: 'dirty',
    typeCheck: 'Type Check',
    typeCheckTip: 'Check for TypeScript type errors (tsc --noEmit)',
    lintFix: 'Lint Fix',
    lintFixTip: 'Auto-fix ESLint violations in changed files',
    runTests: 'Run Tests',
    runTestsTip: 'Run Vitest unit tests',
    formatAll: 'Format Check',
    formatAllTip: 'Check code style of changed files with Prettier',
    running: 'Running...',
    success: 'Success',
    failed: 'Failed',
    notAvailable: 'Not available',
  },

  // Status
  status: { active: 'Active', inactive: 'Inactive', error: 'Error' },

  // Logs
  logs: {
    title: 'Logs',
    search: 'Search (regex)...',
    autoScroll: 'Auto-scroll',
    on: 'ON',
    off: 'OFF',
    entries: 'entries',
    noLogs: 'No logs yet. Waiting for events...',
    noMatch: 'No logs match current filters.',
    invalidRegex: 'Invalid regex',
    showStack: 'Show stack',
    hideStack: 'Hide stack',
  },

  // Timeline
  timeline: {
    title: 'Timeline',
    allEvents: 'All Events',
    allResults: 'All Results',
    noEvents: 'No hook events yet.',
    noMatch: 'No events match current filters.',
    loadMore: 'Load more...',
    events: ' events',
  },

  // Sentry
  sentry: {
    title: 'Sentry',
    placeholder: 'No issues found',
  },

  // About
  about: {
    title: 'About',
    tagline: '4-Layer Error Automation System',
    description:
      'wardex is an Electron-based dashboard that automatically detects, blocks, and tracks errors from development to production. It integrates Claude Code hooks, Git hooks, CI/CD, and Sentry into 4 layers for real-time code quality management.',
    layers: {
      title: '4-Layer Architecture',
      l1: 'Layer 1 — Claude Code Hooks: Instant ESLint auto-fix on code edits, dangerous command blocking, protected file monitoring',
      l2: 'Layer 2 — Git Hooks: lint-staged before commit, typecheck + test gate before push',
      l3: 'Layer 3 — CI/CD: GitHub Actions validates lint → typecheck → test → build on every PR',
      l4: 'Layer 4 — Sentry: Production runtime error collection, stack traces, session replay',
    },
    version: 'Version',
    developer: 'Developer',
    github: 'GitHub',
    license: 'License',
    techStack: 'Tech Stack',
  },

  // Sidebar (about)
  nav_about: 'About',

  // Settings
  settings: {
    title: 'Settings',
    saved: 'Saved',
    saveFailed: 'Failed to save',
    sentrySection: 'Sentry',
    dsn: 'DSN',
    dsnHelp: 'Select project → Client Keys (DSN) → Copy DSN value → Paste here',
    authToken: 'Auth Token',
    authTokenHelp:
      'Settings → Account → API → Auth Tokens → Create New Token → Select project:read, event:read scopes → Copy token',
    organization: 'Organization',
    orgHelp: 'Settings → Organization → General Settings → Copy Organization Slug',
    project: 'Project',
    projectHelp: 'Settings → Projects → Select project → Name or URL slug value',
    uiSection: 'UI',
    darkMode: 'Dark Mode',
    logBufferSize: 'Log buffer size',
    language: 'Language',
    hookStatus: 'Hook Status',
    hookRegistered: 'registered in .claude/settings.json',
  },
} as const
