import { useState, useCallback } from 'react'
import EquipmentPalette from '../components/equipment/EquipmentPalette'
import SchemeCanvas from '../components/equipment/SchemeCanvas'
import '../roles-theme.css'
import './RTP.css'

let nextPlacedId = 1

function CombatSection2() {
  const [vehicles, setVehicles] = useState([])
  const [placedItems, setPlacedItems] = useState([])
  const [zoom, setZoom] = useState(1)

  const handlePlace = useCallback((item, x, y) => {
    setPlacedItems((prev) => [
      ...prev,
      { id: nextPlacedId++, ...item, x, y, scaleX: 1, scaleY: 1, rotation: 0 },
    ])
  }, [])

  const handleMove = useCallback((id, x, y) => {
    setPlacedItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p))
    )
  }, [])

  const handleRemove = useCallback((id) => {
    setPlacedItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const handleScaleChange = useCallback((id, newScaleX, newScaleY) => {
    setPlacedItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, scaleX: newScaleX, scaleY: newScaleY } : p
      )
    )
  }, [])

  const handleRotationChange = useCallback((id, degrees) => {
    setPlacedItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: degrees } : p))
    )
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="role-layout rtp-page relative z-10 w-full max-w-[1600px] mx-auto px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--role-accent-light)] font-medium">Боевой участок 2</p>
        <h2 className="page-title">Боевой участок 2</h2>

      <div className="rtp-grid">
        <aside className="rtp-sidebar">
          <section className="panel panel-equipment">
            <EquipmentPalette />
          </section>

          <section className="panel panel-otv">
            <h3>Остаток ОТВ на автомобилях</h3>
            <div className="vehicles-list">
              {vehicles.length === 0 ? (
                <p className="empty-state">
                  Техника появится после расстановки на схеме
                </p>
              ) : (
                vehicles.map((v, i) => (
                  <div key={i} className="vehicle-otv">
                    <span className="vehicle-name">{v.name}</span>
                    <div className="otv-bars">
                      <div className="otv-row">
                        <span>Вода:</span>
                        <div className="otv-bar"><div className="otv-fill" style={{ width: `${v.water}%` }} /></div>
                        <span>{v.water}%</span>
                      </div>
                      <div className="otv-row">
                        <span>ПАВ:</span>
                        <div className="otv-bar"><div className="otv-fill foam" style={{ width: `${v.foam || 0}%` }} /></div>
                        <span>{v.foam ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel panel-nozzles">
            <h3>Стволы в действии</h3>
            <p className="panel-hint">Регулировка расхода воды</p>
            <div className="nozzles-list">
              <p className="empty-state">Стволы появятся после ввода в действие</p>
            </div>
          </section>
        </aside>

        <section className="rtp-scheme-area">
          <div className="scheme-header">
            <h3>Схема с текущей обстановкой</h3>
            <p className="panel-hint">
              Зона пожара, задымление, расстановка техники, рукавные линии
            </p>
          </div>
          <div className="scheme-zoom-controls">
            <span>Масштаб карты:</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
            >
              −
            </button>
            <span className="scheme-zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
            >
              +
            </button>
          </div>
          <SchemeCanvas
            placedItems={placedItems}
            onPlace={handlePlace}
            onMove={handleMove}
            onRemove={handleRemove}
            onScaleChange={handleScaleChange}
            onRotationChange={handleRotationChange}
            readOnly={false}
            zoom={zoom}
          />
        </section>
      </div>
      </div>
    </main>
  )
}

export default CombatSection2
