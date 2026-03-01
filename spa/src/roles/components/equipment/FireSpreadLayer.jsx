import { useEffect, useState, useRef } from 'react'
import { getRoomTimer, getRoomFireState } from '@/api'

const VIEWBOX = { w: 1920, h: 1080 }

function geoJsonRingsToPath(rings) {
  if (!rings || !Array.isArray(rings)) return ''
  return rings
    .map((ring) => {
      if (!Array.isArray(ring) || ring.length < 2) return ''
      const points = ring.map((p) => {
        const x = Array.isArray(p) ? p[0] : (p && p.x != null ? p.x : 0)
        const y = Array.isArray(p) ? p[1] : (p && p.y != null ? p.y : 0)
        return `${Number(x)} ${Number(y)}`
      })
      return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`
    })
    .filter(Boolean)
    .join(' ')
}

/**
 * Слой распространения огня: запрашивает состояние огня по elapsed времени
 * и рисует полигон огня поверх схемы. Синхронизировано между всеми ролями за счёт
 * общего timer_started_at и одного и того же time.
 */
export default function FireSpreadLayer({ roomId, zoom = 1 }) {
  const [fireState, setFireState] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!roomId) return

    let cancelled = false

    async function init() {
      try {
        const timer = await getRoomTimer(roomId)
        const at = timer?.timer_started_at
        if (!at && at !== null) return
        if (cancelled) return
        setStartedAt(at)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId || !startedAt || startedAt === undefined) return

    function elapsedSeconds() {
      if (!startedAt) return 0
      const start = new Date(startedAt).getTime()
      return (Date.now() - start) / 1000
    }

    async function fetchFire() {
      try {
        const time = elapsedSeconds()
        const state = await getRoomFireState(roomId, time)
        setFireState(state)
        setError(null)
      } catch (e) {
        setError(String(e))
      }
    }

    fetchFire()
    const id = setInterval(fetchFire, 500)
    intervalRef.current = id
    return () => clearInterval(id)
  }, [roomId, startedAt])

  if (!roomId || startedAt === null) return null
  if (error && !fireState) return null

  const firePath = fireState?.fire
    ? geoJsonRingsToPath(
        fireState.fire.type === 'Polygon'
          ? fireState.fire.coordinates
          : fireState.fire.type === 'MultiPolygon'
            ? fireState.fire.coordinates.flat()
            : []
      )
    : ''
  const buildingPath = fireState?.building
    ? geoJsonRingsToPath(
        fireState.building.type === 'Polygon'
          ? fireState.building.coordinates
          : fireState.building.type === 'MultiPolygon'
            ? fireState.building.coordinates.flat()
            : []
      )
    : ''

  return (
    <svg
      className="scheme-canvas-overlay fire-spread-layer"
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      preserveAspectRatio="none"
      style={{ pointerEvents: 'none', zIndex: 2 }}
    >
      {buildingPath && (
        <path
          d={buildingPath}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.5}
        />
      )}
      {firePath && (
        <path
          d={firePath}
          fill="rgba(211, 84, 0, 0.7)"
          stroke="rgba(230, 126, 34, 1)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}
