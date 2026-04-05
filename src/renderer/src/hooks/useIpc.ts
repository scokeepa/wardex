import { useEffect, useRef, useCallback, useState } from 'react'
import type { LogEntry, HookEvent, SystemHealth } from '../../../shared/types'

export function useLogStream(onMessage: (entry: LogEntry) => void): void {
  const ref = useRef(onMessage)
  ref.current = onMessage

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onLogMessage((entry) => {
      ref.current(entry)
    })
  }, [])
}

export function useHookEventStream(onEvent: (event: HookEvent) => void): void {
  const ref = useRef(onEvent)
  ref.current = onEvent

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onHookEvent((event) => {
      ref.current(event)
    })
  }, [])
}

export function useHealthUpdate(onUpdate: (health: Partial<SystemHealth>) => void): void {
  const ref = useRef(onUpdate)
  ref.current = onUpdate

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onHealthUpdate((health) => {
      ref.current(health)
    })
  }, [])
}

let cachedHealth: { data: SystemHealth; timestamp: number } | null = null
const CACHE_TTL = 30_000

export function useSystemHealth(): { health: SystemHealth | null; refresh: () => void } {
  const [health, setHealth] = useState(cachedHealth?.data ?? null)

  const doFetch = useCallback(() => {
    if (!window.wardex) return
    window.wardex
      .getSystemHealth()
      .then((h) => {
        cachedHealth = { data: h, timestamp: Date.now() }
        setHealth(h)
      })
      .catch(() => {
        /* ignore */
      })
  }, [])

  useEffect(() => {
    if (cachedHealth && Date.now() - cachedHealth.timestamp < CACHE_TTL) {
      setHealth(cachedHealth.data)
      doFetch() // background refresh
    } else {
      doFetch()
    }
  }, [doFetch])

  return { health, refresh: doFetch }
}
