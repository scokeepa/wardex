import Badge from './Badge'

interface StatusCardProps {
  title: string
  description?: string
  status: 'active' | 'inactive' | 'error'
  details: string
}

export default function StatusCard({
  title,
  description,
  status,
  details,
}: StatusCardProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</h3>
        <Badge status={status} />
      </div>
      {description ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">{description}</p>
      ) : null}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{details}</p>
    </div>
  )
}
