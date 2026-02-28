import EquipmentItem from './EquipmentItem'
import { EQUIPMENT_BLOCKS } from '../../data/equipmentConfig'
import './EquipmentPalette.css'

/**
 * Панель с блоками элементов для перетаскивания на схему.
 * Все блоки всегда развёрнуты, tooltip с ТТХ при наведении.
 */
function EquipmentPalette({ disabled }) {
  return (
    <div className="equipment-palette">
      <h3>Элементы схемы</h3>
      <p className="equipment-palette-hint">
        Перетащите элементы на схему. При наведении — характеристики.
      </p>
      <div className="equipment-blocks">
        {EQUIPMENT_BLOCKS.map((block) => (
          <div key={block.id} className="equipment-block">
            <div className="equipment-block-header">
              <span className="equipment-block-title">{block.title}</span>
            </div>
            <div className="equipment-block-items">
              {block.items.map((item) => (
                <EquipmentItem
                  key={item.id}
                  item={{ ...item, sheet: block.sheet }}
                  blockId={block.id}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EquipmentPalette
