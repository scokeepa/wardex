import { useState, useEffect } from 'react'
import type { ActionType, ActionResult } from '../../../shared/types'
import { useSystemHealth } from '../hooks/useIpc'
import { useI18n } from '../i18n'
import StatusCard from '../components/StatusCard'
import Skeleton from '../components/Skeleton'
import Tooltip from '../components/Tooltip'

export default function Dashboard(): React.JSX.Element {
  const { health, refresh: loadHealth } = useSystemHealth()
  const [runningAction, setRunningAction] = useState<ActionType | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onHealthUpdate(() => {
      loadHealth()
    })
  }, [loadHealth])

  async function handleAction(action: ActionType): Promise<void> {
    if (runningAction || !window.wardex) return
    setRunningAction(action)
    setActionResult(null)
    const result = await window.wardex.runAction(action)
    setActionResult(result)
    setRunningAction(null)
    loadHealth()
  }

  const d = t.dashboard

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{d.title}</h1>

      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">{d.layers}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatusCard
            title={d.l1}
            description={d.l1Desc}
            status={health?.layers.claudeCode.active ? 'active' : 'inactive'}
            details={
              health ? `${String(health.layers.claudeCode.hookCount)}${d.hooks}` : t.app.checking
            }
          />
          <StatusCard
            title={d.l2}
            description={d.l2Desc}
            status={health?.layers.gitHooks.preCommit ? 'active' : 'inactive'}
            details={
              health
                ? `${d.preCommit}: ${health.layers.gitHooks.preCommit ? 'yes' : 'no'} / ${d.prePush}: ${health.layers.gitHooks.prePush ? 'yes' : 'no'}`
                : t.app.checking
            }
          />
          <StatusCard
            title={d.l3}
            description={d.l3Desc}
            status={health?.layers.cicd.configured ? 'active' : 'inactive'}
            details={health?.layers.cicd.configured ? d.configured : d.notConfigured}
          />
          <StatusCard
            title={d.l4}
            description={d.l4Desc}
            status={health?.layers.sentry.connected ? 'active' : 'inactive'}
            details={
              health?.layers.sentry.connected
                ? `${String(health.layers.sentry.unresolvedCount)}${d.unresolved}`
                : d.notConnected
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">{d.systemHealth}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {!health ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : (
            <>
              <HealthItem
                label="TypeScript"
                value={
                  health.typescript.checked
                    ? `${String(health.typescript.errors)}${d.errors}`
                    : t.app.checking
                }
                ok={health.typescript.checked && health.typescript.errors === 0}
              />
              <HealthItem
                label="ESLint"
                value={
                  health.eslint.checked
                    ? `${String(health.eslint.errors)} err / ${String(health.eslint.warnings)} warn`
                    : t.app.checking
                }
                ok={health.eslint.checked && health.eslint.errors === 0}
              />
              <HealthItem
                label="Tests"
                value={
                  health.tests.checked
                    ? `${String(health.tests.passed)}/${String(health.tests.total)}${d.passed}`
                    : t.app.checking
                }
                ok={health.tests.checked && health.tests.failed === 0}
              />
              <HealthItem
                label="Git"
                value={`${health.git.branch} (${health.git.clean ? d.clean : d.dirty})`}
                ok={health.git.clean}
              />
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">{d.quickActions}</h2>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['typecheck', d.typeCheck, d.typeCheckTip],
              ['lint-fix', d.lintFix, d.lintFixTip],
              ['test', d.runTests, d.runTestsTip],
              ['format', d.formatAll, d.formatAllTip],
            ] as const
          ).map(([action, label, tooltip]) => (
            <Tooltip key={action} text={tooltip as string}>
              <button
                type="button"
                onClick={() => {
                  void handleAction(action as ActionType)
                }}
                disabled={runningAction !== null}
                className="rounded bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {runningAction === action ? d.running : label}
              </button>
            </Tooltip>
          ))}
        </div>
        {actionResult ? (
          <div
            className={`mt-3 rounded border p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto ${actionResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'}`}
          >
            <div className="font-sans text-sm font-semibold mb-1">
              {actionResult.success ? d.success : d.failed} ({String(actionResult.duration)}ms)
            </div>
            {actionResult.output || actionResult.error || 'No output'}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function HealthItem({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok?: boolean
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-700 p-3">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
      <div
        className={`text-sm font-medium ${ok === true ? 'text-green-700' : ok === false ? 'text-red-700' : 'text-neutral-500'}`}
      >
        {value}
      </div>
    </div>
  )
}
