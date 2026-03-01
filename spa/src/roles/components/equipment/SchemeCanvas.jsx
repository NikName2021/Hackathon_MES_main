import { useRef, useState } from 'react'
import { useCanvasBackgroundUrl, useCanvasObjects } from '../../../store/canvas'
import FireSpreadLayer from './FireSpreadLayer'
import './SchemeCanvas.css'

/**
 * Область схемы, куда перетаскиваются элементы.
 * Отображает размещённые элементы с возможностью перетаскивания.
 * Если передан roomId, поверх схемы рисуется слой распространения огня (синхронизирован между ролями).
 */
const BASE_WIDTH = 960
const BASE_HEIGHT = 540

function SchemeCanvas({
  placedItems,
  onPlace,
  onMove,
  onRemove,
  onScaleChange,
  onRotationChange,
  readOnly,
  zoom = 1,
  roomId = null,
  showFireObjects = true,
  showFireSpread = true,
}) {
  const [dragOver, setDragOver] = useState(false)
  const scrollRef = useRef(null)
  const canvasObjects = useCanvasObjects()
  const canvasBackground = useCanvasBackgroundUrl()
  const hasCanvasObjects = canvasObjects && canvasObjects.length > 0
  const hasCanvasLayer = Boolean(canvasBackground) || hasCanvasObjects

  const renderCanvasObject = (obj) => {
    const rotation = obj.rotation ?? 0
    const stroke = obj.color || '#F97316'
    if (obj.type === 'line') {
      const cx = (obj.x1 + obj.x2) / 2
      const cy = (obj.y1 + obj.y2) / 2
      return (
        <line
          key={obj.id}
          x1={obj.x1}
          y1={obj.y1}
          x2={obj.x2}
          y2={obj.y2}
          stroke={stroke}
          strokeWidth={obj.strokeWidth || 2}
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      )
    }
    if (obj.type === 'rect') {
      const cx = obj.x + obj.width / 2
      const cy = obj.y + obj.height / 2
      return (
        <rect
          key={obj.id}
          x={obj.x}
          y={obj.y}
          width={obj.width}
          height={obj.height}
          fill="none"
          stroke={stroke}
          strokeWidth={obj.strokeWidth || 2}
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      )
    }
    if (obj.type === 'circle') {
      return (
        <circle
          key={obj.id}
          cx={obj.x}
          cy={obj.y}
          r={obj.radius}
          fill="none"
          stroke={stroke}
          strokeWidth={obj.strokeWidth || 2}
          transform={`rotate(${rotation} ${obj.x} ${obj.y})`}
        />
      )
    }
    if (obj.type === 'fire') {
      if (!showFireObjects) return null
      return (
        <circle
          key={obj.id}
          cx={obj.x}
          cy={obj.y}
          r={obj.radius}
          fill={obj.color || '#EF4444'}
          stroke="#111827"
          strokeWidth={1}
          transform={`rotate(${rotation} ${obj.x} ${obj.y})`}
        />
      )
    }
    return null
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const getCanvasCoords = (event) => {
    const container = scrollRef.current || event.currentTarget
    const rect = container.getBoundingClientRect()
    const scrollLeft = container.scrollLeft || 0
    const scrollTop = container.scrollTop || 0
    return {
      x: (scrollLeft + (event.clientX - rect.left)) / zoom,
      y: (scrollTop + (event.clientY - rect.top)) / zoom,
    }
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
        const { x, y } = getCanvasCoords(e)
        onPlace(data.item, x, y)
      } else if (data.source === 'canvas' && data.id !== undefined) {
        const { x, y } = getCanvasCoords(e)
        onMove(data.id, x, y)
      }
    } catch (err) {
      console.warn('Drop parse error', err)
    }
  }

  // Панорамирование теперь через скролл контейнера.

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
      ref={scrollRef}
      className={`scheme-canvas scheme-canvas-drop ${dragOver ? 'scheme-canvas-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="scheme-canvas-viewport"
        style={{ width: `${BASE_WIDTH * zoom}px`, height: `${BASE_HEIGHT * zoom}px` }}
      >
        <div
          className="scheme-canvas-inner"
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
        {hasCanvasLayer && (
          <svg
            className="scheme-canvas-overlay"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="none"
          >
            {canvasBackground && (
              <image
                href={canvasBackground}
                width="1920"
                height="1080"
                preserveAspectRatio="none"
              />
            )}
            {canvasObjects.map(renderCanvasObject)}
          </svg>
        )}
        {roomId && showFireSpread && <FireSpreadLayer roomId={roomId} zoom={zoom} />}
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
        {placedItems.length === 0 && !hasCanvasLayer && (
          <div className="scheme-placeholder">
            Перетащите элементы с панели сюда
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default SchemeCanvas
