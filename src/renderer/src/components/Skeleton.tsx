// G11: 스켈레톤 UI — 로딩 중 플레이스홀더

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return <div className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ${className}`} />
}
