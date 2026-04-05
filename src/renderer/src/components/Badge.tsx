interface BadgeProps {
  status: 'active' | 'inactive' | 'error'
  label?: string
}

const STYLES: Record<BadgeProps['status'], string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-neutral-100 text-neutral-500',
  error: 'bg-red-100 text-red-800',
}

const LABELS: Record<BadgeProps['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  error: 'Error',
}

export default function Badge({ status, label }: BadgeProps): React.JSX.Element {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {label ?? LABELS[status]}
    </span>
  )
}
