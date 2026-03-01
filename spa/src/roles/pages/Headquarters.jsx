import { useState, useCallback, useEffect, useRef } from 'react'
import EquipmentPalette from '../components/equipment/EquipmentPalette'
import SchemeCanvas from '../components/equipment/SchemeCanvas'
import { usePlayerData } from '@/store/player'
import { useRoomGameSocket } from '@/hooks/useRoomGameSocket'
import { getCanvasState, setCanvasBackgroundUrl, setCanvasObjects } from '@/store/canvas'
import { getSimulationState, postHeadquartersAddCombatSection } from '@/api'
import '../roles-theme.css'
import './RTP.css'

const MAX_COMBAT_SECTIONS = 2

function Headquarters() {
  const roomId = usePlayerData()?.room_id ?? null
  const { sendSceneUpdate, remoteState, isConnected } = useRoomGameSocket(roomId)

  const [vehicles, setVehicles] = useState([])
  const nextPlacedIdRef = useRef(1)
  const [placedItems, setPlacedItems] = useState([])
  const [zoom, setZoom] = useState(1)
  const [combatSectionsCount, setCombatSectionsCount] = useState(0)
  const sectionsLocked = combatSectionsCount >= MAX_COMBAT_SECTIONS

  useEffect(() => {
    if (!roomId) return
    getSimulationState(roomId).then((s) => {
      const n = Number(s.combat_sections_added)
      if (n >= 0 && n <= MAX_COMBAT_SECTIONS) setCombatSectionsCount(n)
    }).catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!remoteState) return
    setPlacedItems(Array.isArray(remoteState.placedItems) ? remoteState.placedItems : [])
    if (typeof remoteState.zoom === 'number') setZoom(remoteState.zoom)
    const items = Array.isArray(remoteState.placedItems) ? remoteState.placedItems : []
    const ids = items.map((i) => Number(i.id)).filter((n) => !Number.isNaN(n))
    nextPlacedIdRef.current = ids.length ? Math.max(...ids, 0) + 1 : 1
    if (remoteState.canvasBackground !== undefined) setCanvasBackgroundUrl(remoteState.canvasBackground ?? null)
    if (remoteState.canvasObjectsProvided && Array.isArray(remoteState.canvasObjects)) {
      setCanvasObjects(remoteState.canvasObjects)
    }
  }, [remoteState])

  const pushScene = useCallback((placedItemsNext, zoomNext) => {
    const z = zoomNext ?? zoomRef.current
    const canvas = getCanvasState()
    sendSceneUpdate({ placedItems: placedItemsNext, zoom: z, canvasBackground: canvas.backgroundUrl, canvasObjects: canvas.objects })
  }, [sendSceneUpdate])

  const zoomRef = useRef(1)
  zoomRef.current = zoom

  const handlePlace = useCallback((item, x, y) => {
    const id = nextPlacedIdRef.current++
    setPlacedItems((prev) => {
      const next = [...prev, { id, ...item, x, y, scaleX: 1, scaleY: 1, rotation: 0 }]
      setTimeout(() => pushScene(next), 0)
      return next
    })
  }, [pushScene])

  const handleMove = useCallback((id, x, y) => {
    setPlacedItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, x, y } : p))
      setTimeout(() => pushScene(next), 0)
      return next
    })
  }, [pushScene])

  const handleRemove = useCallback((id) => {
    setPlacedItems((prev) => {
      const next = prev.filter((p) => p.id !== id)
      setTimeout(() => pushScene(next), 0)
      return next
    })
  }, [pushScene])

  const handleScaleChange = useCallback((id, newScaleX, newScaleY) => {
    setPlacedItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, scaleX: newScaleX, scaleY: newScaleY } : p))
      setTimeout(() => pushScene(next), 0)
      return next
    })
  }, [pushScene])

  const handleRotationChange = useCallback((id, degrees) => {
    setPlacedItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, rotation: degrees } : p))
      setTimeout(() => pushScene(next), 0)
      return next
    })
  }, [pushScene])

  const handleZoomDown = useCallback(() => {
    const z = Math.max(0.5, +(zoom - 0.1).toFixed(1))
    setZoom(z)
    setTimeout(() => pushScene(placedItems, z), 0)
  }, [zoom, placedItems, pushScene])

  const handleZoomUp = useCallback(() => {
    const z = Math.min(2, +(zoom + 0.1).toFixed(1))
    setZoom(z)
    setTimeout(() => pushScene(placedItems, z), 0)
  }, [zoom, placedItems, pushScene])

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="role-layout rtp-page relative z-10 w-full max-w-[1600px] mx-auto px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--role-accent-light)] font-medium">Штаб</p>
        <h2 className="page-title">Рабочее место Штаб</h2>
        <div className="rtp-grid">
          <aside className="rtp-sidebar">
            <section className="panel panel-equipment">
              <EquipmentPalette disabled={sectionsLocked} />
            </section>
            <section className="panel panel-hq">
              <button
                type="button"
                className="btn btn-primary btn-create-hq"
                onClick={async () => {
                  if (sectionsLocked) return
                  if (roomId) {
                    try {
                      const res = await postHeadquartersAddCombatSection(roomId)
                      const n = Number(res.combat_sections_added)
                      if (n >= 0 && n <= MAX_COMBAT_SECTIONS) setCombatSectionsCount(n)
                      return
                    } catch (_) {}
                  }
                  setCombatSectionsCount((c) => Math.min(c + 1, MAX_COMBAT_SECTIONS))
                }}
                disabled={sectionsLocked}
              >
                Добавить боевые участки
              </button>
              <div className="combat-sections-status">
                {combatSectionsCount > 0 && (
                  <ul className="sections-list">
                    {Array.from({ length: combatSectionsCount }, (_, i) => (
                      <li key={i}>Боевой участок {i + 1} — активен</li>
                    ))}
                  </ul>
                )}
                {sectionsLocked && <p className="panel-hint">Добавлено максимальное количество участков (2).</p>}
              </div>
            </section>
            <section className="panel panel-otv">
              <h3>Остаток ОТВ на автомобилях</h3>
              <div className="vehicles-list">
                {vehicles.length === 0 ? <p className="empty-state">Техника появится после расстановки на схеме</p> : vehicles.map((v, i) => (
                  <div key={i} className="vehicle-otv">
                    <span className="vehicle-name">{v.name}</span>
                    <div className="otv-bars">
                      <div className="otv-row"><span>Вода:</span><div className="otv-bar"><div className="otv-fill" style={{ width: `${v.water}%` }} /></div><span>{v.water}%</span></div>
                      <div className="otv-row"><span>ПАВ:</span><div className="otv-bar"><div className="otv-fill foam" style={{ width: `${v.foam || 0}%` }} /></div><span>{v.foam ?? 0}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel panel-nozzles">
              <h3>Стволы в действии</h3>
              <p className="panel-hint">Регулировка расхода воды</p>
              <div className="nozzles-list"><p className="empty-state">Стволы появятся после ввода в действие</p></div>
            </section>
          </aside>
          <section className="rtp-scheme-area">
            <div className="scheme-header">
              <h3>Схема с текущей обстановкой</h3>
              <p className="panel-hint">Зона пожара, задымление, расстановка техники, рукавные линии</p>
            </div>
            <div className="scheme-zoom-controls">
              <span>Масштаб карты:</span>
              <button type="button" onClick={handleZoomDown}>−</button>
              <span className="scheme-zoom-value">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={handleZoomUp}>+</button>
              {roomId && <span className="text-xs opacity-70 ml-2">{isConnected ? '🟢 сцена синхронизируется' : '🔴 нет связи'}</span>}
            </div>
            <SchemeCanvas placedItems={placedItems} onPlace={handlePlace} onMove={handleMove} onRemove={handleRemove} onScaleChange={handleScaleChange} onRotationChange={handleRotationChange} readOnly={sectionsLocked} zoom={zoom} roomId={roomId} />
            {sectionsLocked && <p className="scheme-lock-hint">Добавлено два боевых участка. Схема заблокирована для редактирования.</p>}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Headquarters
