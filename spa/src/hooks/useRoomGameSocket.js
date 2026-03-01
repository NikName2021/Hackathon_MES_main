import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || '').trim()

/**
 * URL WebSocket для синхронизации сцены комнаты.
 * Берёт хост из VITE_API_URL или из window.location.
 */
function getGameSocketUrl(roomId) {
  const path = `/api/v1/room/ws/game/${roomId}`
  if (API_URL) {
    const base = API_URL.replace(/\/$/, '')
    const protocol = base.startsWith('https') ? 'wss' : 'ws'
    const host = base.replace(/^https?:\/\//, '')
    return `${protocol}://${host}${path}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}${path}`
}

/**
 * Состояние сцены: то, что хранится в БД и рассылается по сокету.
 * @typedef {{ placedItems: any[], zoom?: number, canvasBackground?: string | null, canvasObjects?: any[] }} SceneState
 */

/**
 * WebSocket комнаты для синхронизации сцены (SchemeCanvas: placedItems + zoom + canvas layer).
 * - При подключении сервер шлёт scene_state с текущим состоянием из БД.
 * - При изменении сцены вызываем sendSceneUpdate(state); сервер сохраняет в БД и рассылает остальным.
 *
 * @param {string | null} roomId — id комнаты (например usePlayerData()?.room_id)
 * @returns {{ sendSceneUpdate: (state: SceneState) => void, remoteState: SceneState | null, isConnected: boolean }}
 */
export function useRoomGameSocket(roomId) {
  const [remoteState, setRemoteState] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const disposed = useRef(false)

  const sendSceneUpdate = useCallback((state) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    try {
      ws.send(JSON.stringify({ event: 'scene_update', data: state || {} }))
    } catch (err) {
      console.warn('useRoomGameSocket send error', err)
    }
  }, [])

  useEffect(() => {
    if (!roomId) {
      setRemoteState(null)
      setIsConnected(false)
      return
    }

    disposed.current = false

    function connect() {
      if (disposed.current) return

      const url = getGameSocketUrl(roomId)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (disposed.current) { ws.close(); return }
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        if (disposed.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.event === 'scene_state' || msg.event === 'scene_update') {
            const data = msg.data != null && typeof msg.data === 'object'
              ? msg.data
              : {}
            const hasPlacedItems = Object.prototype.hasOwnProperty.call(data, 'placedItems')
            const hasZoom = Object.prototype.hasOwnProperty.call(data, 'zoom')
            const hasCanvasBackground = Object.prototype.hasOwnProperty.call(data, 'canvasBackground')
            const hasCanvasObjects = Object.prototype.hasOwnProperty.call(data, 'canvasObjects')

            setRemoteState((prev) => {
              const base = prev || {
                placedItems: [],
                zoom: 1,
                canvasBackground: null,
                canvasObjects: [],
                canvasObjectsProvided: false,
              }

              return {
                placedItems: hasPlacedItems
                  ? (Array.isArray(data.placedItems) ? data.placedItems : [])
                  : base.placedItems,
                zoom: hasZoom
                  ? (typeof data.zoom === 'number' ? data.zoom : base.zoom)
                  : base.zoom,
                canvasBackground: hasCanvasBackground
                  ? (data.canvasBackground ?? null)
                  : base.canvasBackground,
                canvasObjects: hasCanvasObjects
                  ? (Array.isArray(data.canvasObjects) ? data.canvasObjects : [])
                  : base.canvasObjects,
                canvasObjectsProvided: hasCanvasObjects,
              }
            })
          }
        } catch (e) {
          console.warn('useRoomGameSocket parse error', e)
        }
      }

      ws.onclose = () => {
        if (disposed.current) return
        setIsConnected(false)
        wsRef.current = null
        // ── Реконнект через 3 с ──
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {}
    }

    connect()

    return () => {
      disposed.current = true

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      const ws = wsRef.current
      if (ws) {
        // Убираем обработчики, чтобы onclose не запланировал реконнект
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        if (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
        wsRef.current = null
      }

      setIsConnected(false)
    }
  }, [roomId])

  return { sendSceneUpdate, remoteState, isConnected }
}
