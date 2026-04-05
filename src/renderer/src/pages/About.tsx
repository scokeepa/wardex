import { useI18n } from '../i18n'

const TECH_STACK = [
  ['Electron + electron-vite', 'Desktop runtime + build'],
  ['React 19 + TypeScript', 'UI + strict type safety'],
  ['Tailwind CSS v4', 'Styling'],
  ['Vitest + Testing Library', 'Unit tests'],
  ['ESLint + Prettier', 'Lint + format'],
  ['husky + lint-staged', 'Git hooks'],
  ['GitHub Actions', 'CI/CD'],
  ['Sentry', 'Runtime error tracking'],
  ['electron-log', 'Logging'],
  ['electron-store', 'Settings persistence'],
  ['chokidar', 'File watching'],
] as const

const VERSION = '1.0.0'
const DEVELOPER = 'csm'
const GITHUB_URL = 'https://github.com/csm/wardex'
const LICENSE = 'ISC'

export default function About(): React.JSX.Element {
  const { t } = useI18n()
  const a = t.about

  return (
    <div className="max-w-2xl space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">{t.app.name}</h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400 mt-1">{a.tagline}</p>
      </div>

      {/* 설명 */}
      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
        {a.description}
      </p>

      {/* 4-Layer 아키텍처 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{a.layers.title}</h2>
        <div className="space-y-2">
          {[a.layers.l1, a.layers.l2, a.layers.l3, a.layers.l4].map((desc, i) => (
            <div key={desc} className="flex gap-3 items-start">
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${LAYER_COLORS[i] ?? ''}`}
              >
                {String(i + 1)}
              </span>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 프로젝트 정보 */}
      <section>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label={a.version} value={VERSION} />
          <InfoRow label={a.developer} value={DEVELOPER} />
          <InfoRow label={a.license} value={LICENSE} />
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{a.github}</div>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault()
                window.open(GITHUB_URL, '_blank')
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {GITHUB_URL.replace('https://github.com/', '')}
            </a>
          </div>
        </div>
      </section>

      {/* 기술 스택 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{a.techStack}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {TECH_STACK.map(([name, desc]) => (
            <div key={name} className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {name}
              </span>
              <span className="text-xs text-neutral-400">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const LAYER_COLORS = ['bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-red-500']

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
      <div className="text-sm font-medium dark:text-neutral-200">{value}</div>
    </div>
  )
}
