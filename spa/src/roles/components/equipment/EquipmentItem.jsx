import { useState } from 'react'
import './EquipmentItem.css'

/**
 * Элемент справочника: символ + tooltip при наведении с ТТХ.
 * Поддержка drag для перетаскивания на схему.
 */
function EquipmentItem({ item, blockId, disabled }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ x: rect.left, y: rect.bottom + 4 })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const handleDragStart = (e) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('application/json', JSON.stringify({
      item,
      blockId,
      source: 'palette',
    }))
    e.dataTransfer.effectAllowed = 'copy'
    e.target.classList.add('equipment-item-dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('equipment-item-dragging')
  }

  const sheet = item.sheet || 'Лист 01'
  const imgPath = `/equipment/${encodeURIComponent(sheet)}/${encodeURIComponent(item.file)}`

  return (
    <div
      className={`equipment-item ${disabled ? 'disabled' : ''}`}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={item.name}
    >
      <img
        src={imgPath}
        alt={item.name}
        className="equipment-item-img"
        draggable={false}
      />
      {showTooltip && (
        <div
          className="equipment-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="equipment-tooltip-name">{item.name}</div>
          {item.ttx && (
            <div className="equipment-tooltip-ttx">{item.ttx}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default EquipmentItem
