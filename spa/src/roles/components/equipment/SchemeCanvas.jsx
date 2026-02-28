import { useState } from 'react'
import './SchemeCanvas.css'

/**
 * Область схемы, куда перетаскиваются элементы.
 * Отображает размещённые элементы с возможностью перетаскивания.
 */
function SchemeCanvas({
  placedItems,
  onPlace,
  onMove,
  onRemove,
  onScaleChange,
  onRotationChange,
  readOnly,
  zoom = 1,
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (readOnly) return

    const dataStr = e.dataTransfer.getData('application/json')
    if (!dataStr) return

    try {
      const data = JSON.parse(dataStr)
      if (data.source === 'palette') {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        onPlace(data.item, x, y)
      } else if (data.source === 'canvas' && data.id !== undefined) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        onMove(data.id, x, y)
      }
    } catch (err) {
      console.warn('Drop parse error', err)
    }
  }

  const handleItemDragStart = (e, id) => {
    if (readOnly) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'canvas', id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleResizeMouseDown = (e, item) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const baseScaleX = item.scaleX ?? item.scale ?? 1
    const baseScaleY = item.scaleY ?? item.scale ?? 1
    const id = item.id

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const deltaX = dx / 56
      const deltaY = dy / 56
      const nextX = Math.max(0.5, +(baseScaleX + deltaX).toFixed(2))
      const nextY = Math.max(0.5, +(baseScaleY + deltaY).toFixed(2))
      onScaleChange?.(id, nextX, nextY)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleRotateMouseDown = (e, item) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()

    const itemEl = e.currentTarget.closest('.scheme-item')
    if (!itemEl) return

    const id = item.id

    const getCenter = () => {
      const rect = itemEl.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }

    const getAngleDeg = (clientX, clientY) => {
      const c = getCenter()
      const rad = Math.atan2(clientY - c.y, clientX - c.x)
      return (rad * 180) / Math.PI
    }

    let prevAngle = getAngleDeg(e.clientX, e.clientY)
    let currentRotation = item.rotation ?? 0

    const handleMouseMove = (moveEvent) => {
      const angle = getAngleDeg(moveEvent.clientX, moveEvent.clientY)
      let delta = angle - prevAngle
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      prevAngle = angle
      currentRotation += delta
      onRotationChange?.(id, Math.round(currentRotation * 10) / 10)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={`scheme-canvas scheme-canvas-drop ${dragOver ? 'scheme-canvas-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="scheme-canvas-inner"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        {placedItems.map((item) => (
          <div
            key={item.id}
            className="scheme-item"
            style={{
              left: item.x,
              top: item.y,
              transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)`,
            }}
            draggable={!readOnly}
            onDragStart={(ev) => handleItemDragStart(ev, item.id)}
          >
            <div className="scheme-item-visual">
              <img
                src={`/equipment/${encodeURIComponent(item.sheet || 'Лист 01')}/${encodeURIComponent(item.file)}`}
                alt={item.name}
                draggable={false}
                style={{
                  transform: `scale(${item.scaleX ?? item.scale ?? 1}, ${
                    item.scaleY ?? item.scale ?? 1
                  })`,
                }}
              />
            </div>
            {!readOnly && onRemove && (
              <button
                type="button"
                className="scheme-item-btn scheme-item-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onRemove(item.id)
                }}
                title="Удалить"
                aria-label="Удалить"
              >
                ×
              </button>
            )}
            {!readOnly && onRotationChange && (
              <div
                className="scheme-item-btn scheme-item-rotate-handle"
                onMouseDown={(e) => handleRotateMouseDown(e, item)}
                title="Повернуть (перетащите)"
              >
                ↻
              </div>
            )}
            {!readOnly && (
              <div
                className="scheme-item-btn scheme-item-resize-handle"
                onMouseDown={(e) => handleResizeMouseDown(e, item)}
                title="Масштабировать"
              />
            )}
          </div>
        ))}
        {placedItems.length === 0 && (
          <div className="scheme-placeholder">
            Перетащите элементы с панели сюда
          </div>
        )}
      </div>
    </div>
  )
}

export default SchemeCanvas
