import { useEffect, useState } from 'react'
import SchemeCanvas from '../components/equipment/SchemeCanvas'
import { DISPATCH_VEHICLES } from '../data/vehicleConfig'
import { getRouteDuration } from '../api/geo2gis'
import { getRoomParams } from '../../api'
import { usePlayerData } from '../../store/player'
import { useRoomId } from '../../store/room'
import '../roles-theme.css'
import './Dispatcher.css'

function DispatchVehicleImage({ vehicle, className }) {
  const photoPath = `/equipment/dispatch/${vehicle.id}.png`
  const fallbackPath = `/equipment/${encodeURIComponent(vehicle.sheet)}/${encodeURIComponent(vehicle.file)}`
  const [src, setSrc] = useState(photoPath)
  return (
    <img
      src={src}
      alt={vehicle.name}
      className={className}
      onError={() => setSrc((prev) => (prev === photoPath ? fallbackPath : prev))}
    />
  )
}

function Dispatcher() {
  const playerData = usePlayerData()
  const roomId = useRoomId()
  const activeRoomId = playerData?.room_id ?? roomId
  const [scenario, setScenario] = useState({
    wind: '',
    temperature: '',
    timeOfDay: '',
    waterSupply: 'ok',
  })

  const [protocolRows, setProtocolRows] = useState([])
  const [protocolForm, setProtocolForm] = useState({
    callsign: '',
    action: '',
    time: '',
  })

  const [dispatchQuantities, setDispatchQuantities] = useState({})
  const [dispatchEta, setDispatchEta] = useState({})
  const [dispatches, setDispatches] = useState([])

  const [fireAddress, setFireAddress] = useState(
    'Россия, Сириус, Олимпийский проспект, 15'
  )
  const [dispatchAddress] = useState('Россия, Сириус, Триумфальная ул., 24')
  const [calculatedMinutes, setCalculatedMinutes] = useState(null)
  const [fireCoords, setFireCoords] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(null)

  const mapTimeToDayPart = (timeValue) => {
    if (!timeValue) return ''
    const hour = Number(String(timeValue).split(':')[0])
    if (Number.isNaN(hour)) return ''
    if (hour >= 6 && hour < 18) return 'day'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  useEffect(() => {
    if (!activeRoomId) return
    let active = true

    getRoomParams(activeRoomId)
      .then((params) => {
        if (!active) return
        const windValue =
          params?.wind !== undefined && params?.wind !== null
            ? `${params.wind} м/с`
            : ''
        const temperatureValue =
          params?.temperature !== undefined && params?.temperature !== null
            ? `${params.temperature > 0 ? '+' : ''}${params.temperature} °C`
            : ''
        const timeOfDayValue = mapTimeToDayPart(params?.time)
        const waterValue =
          typeof params?.serviceability_water === 'boolean'
            ? params.serviceability_water
              ? 'ok'
              : 'fail'
            : params?.serviceability_water || 'ok'
        setScenario({
          wind: windValue,
          temperature: temperatureValue,
          timeOfDay: timeOfDayValue,
          waterSupply: waterValue,
        })
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [activeRoomId])

  const handleScenarioChange = (field, value) => {
    setScenario((prev) => ({ ...prev, [field]: value }))
  }

  const handleProtocolChange = (field, value) => {
    setProtocolForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddProtocolRow = () => {
    if (!protocolForm.callsign || !protocolForm.action || !protocolForm.time) return
    setProtocolRows((prev) => [...prev, { ...protocolForm, id: prev.length + 1 }])
    setProtocolForm({ callsign: '', action: '', time: '' })
  }

  const handleDispatchQtyChange = (vehicleId, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setDispatchQuantities((prev) => ({ ...prev, [vehicleId]: num }))
  }

  const handleDispatchEtaChange = (vehicleId, value) => {
    setDispatchEta((prev) => ({ ...prev, [vehicleId]: value }))
  }

  const handleCalculateRoute = async () => {
    setRouteLoading(true)
    setRouteError(null)
    setCalculatedMinutes(null)
    setFireCoords(null)
    try {
      const result = await getRouteDuration(dispatchAddress, fireAddress)
      setCalculatedMinutes(result.durationMinutes)
      setFireCoords(result.firePoint)
    } catch (err) {
      setRouteError(err.message || 'Ошибка расчёта')
    } finally {
      setRouteLoading(false)
    }
  }

  const handleApplyCalculatedTime = () => {
    if (calculatedMinutes == null) return
    const next = {}
    DISPATCH_VEHICLES.forEach((v) => {
      next[v.id] = String(calculatedMinutes)
    })
    setDispatchEta(next)
  }

  const handleSendDispatch = (vehicle) => {
    const qty = dispatchQuantities[vehicle.id] || 0
    const eta = dispatchEta[vehicle.id] || ''
    if (qty < 1 || !eta) return
    setDispatches((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        vehicle,
        count: qty,
        eta,
        time: new Date().toLocaleTimeString(),
      },
    ])
    setDispatchQuantities((prev) => ({ ...prev, [vehicle.id]: 0 }))
    setDispatchEta((prev) => ({ ...prev, [vehicle.id]: '' }))
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="role-layout dispatcher-page relative z-10 w-full max-w-[1600px] mx-auto px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--role-accent-light)] font-medium">Диспетчер</p>
        <h2 className="page-title">Рабочее место Диспетчера</h2>

      <div className="dispatcher-grid">
        {/* Левая панель: вводные, исходные данные сценария */}
        <aside className="dispatcher-sidebar">
          <section className="panel panel-intro">
            <h3>Вводные от руководителя учебного занятия</h3>
            <p className="panel-hint">
              На схеме обучаемый видит следующие элементы, задаваемые руководителем
              учебного занятия:
            </p>
            <ul className="intro-list">
              <li>Очаг пожара</li>
              <li>Точка на схеме</li>
              <li>Зоны пожара</li>
              <li>Полигон, динамически изменяемая область</li>
              <li>Зона температурного воздействия</li>
              <li>Область для введения ручных стволов</li>
              <li>Зоны задымления</li>
              <li>Области задымления</li>
              <li>Места нахождения пострадавших</li>
              <li>Точки расположения условных пострадавших</li>
            </ul>
          </section>

          <section className="panel panel-scenario">
            <h3>Исходные данные сценария</h3>
            <p className="panel-hint">
              Эти исходные данные сценария задаются руководителем учебного занятия и
              на рабочем месте диспетчера только отображаются.
            </p>
            <div className="scenario-grid">
              <label className="form-field">
                <span>Ветер (направление и скорость)</span>
                <input
                  type="text"
                  value={scenario.wind}
                  onChange={(e) => handleScenarioChange('wind', e.target.value)}
                  placeholder="Например: С, 5 м/с"
                  disabled
                />
              </label>
              <label className="form-field">
                <span>Температура воздуха</span>
                <input
                  type="text"
                  value={scenario.temperature}
                  onChange={(e) =>
                    handleScenarioChange('temperature', e.target.value)
                  }
                  placeholder="Например: +5 °C"
                  disabled
                />
              </label>
              <label className="form-field">
                <span>Время суток</span>
                <select
                  value={scenario.timeOfDay}
                  onChange={(e) => handleScenarioChange('timeOfDay', e.target.value)}
                  disabled
                >
                  <option value="">Не выбрано</option>
                  <option value="day">День</option>
                  <option value="evening">Вечер</option>
                  <option value="night">Ночь</option>
                </select>
              </label>
              <label className="form-field">
                <span>Состояние систем ПВ</span>
                <select
                  value={scenario.waterSupply}
                  onChange={(e) =>
                    handleScenarioChange('waterSupply', e.target.value)
                  }
                  disabled
                >
                  <option value="ok">Исправны</option>
                  <option value="partial">Частично неисправны</option>
                  <option value="fail">Неисправны</option>
                </select>
              </label>
            </div>
          </section>
        </aside>

        {/* Правая часть: схема + высылка справа от карты, протокол внизу слева */}
        <section className="dispatcher-main">
          <div className="dispatcher-map-dispatch-row">
            <div className="dispatcher-scheme-area">
              <h3>Схема расстановки сил и средств</h3>
              <p className="panel-hint">
                Схема расстановки сил и средств, формируемая руководителем учебного занятия
                и передаваемая с бэкенда.
              </p>
              <SchemeCanvas placedItems={[]} readOnly zoom={1} />
            </div>

            <section className="panel panel-dispatch">
              <h3>Высылка сил и средств</h3>
              <p className="panel-hint">
                Выберите технику, задайте количество и время следования, затем отправьте.
              </p>

              <div className="dispatch-route-block">
                <h4>Расчёт времени доставки</h4>
                <label className="form-field">
                  <span>Адрес места пожара</span>
                  <input
                    type="text"
                    value={fireAddress}
                    onChange={(e) => setFireAddress(e.target.value)}
                    placeholder="Россия, Сириус, Олимпийский проспект, 15"
                  />
                </label>
                <label className="form-field dispatch-address-readonly">
                  <span>Адрес отправки</span>
                  <input
                    type="text"
                    value={dispatchAddress}
                    readOnly
                    title="Точка выезда техники"
                  />
                </label>
                {fireCoords && (
                  <p className="dispatch-route-coords">
                    Координаты адреса пожара: {fireCoords.lat.toFixed(6)}, {fireCoords.lon.toFixed(6)}
                  </p>
                )}
                <div className="dispatch-route-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCalculateRoute}
                    disabled={routeLoading}
                  >
                    {routeLoading ? 'Расчёт…' : 'Рассчитать время'}
                  </button>
                  {calculatedMinutes != null && (
                    <>
                      <span className="dispatch-route-result">
                        Время в пути: {calculatedMinutes} мин
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleApplyCalculatedTime}
                      >
                        Подставить в «Время след., мин»
                      </button>
                    </>
                  )}
                </div>
                {routeError && (
                  <p className="dispatch-route-error">{routeError}</p>
                )}
              </div>

              <div className="dispatch-vehicles-grid">
                {DISPATCH_VEHICLES.map((v) => (
                  <div key={v.id} className="dispatch-vehicle-card">
                    <div className="dispatch-vehicle-photo">
                      <DispatchVehicleImage vehicle={v} />
                    </div>
                    <div className="dispatch-vehicle-info">
                      <div className="dispatch-vehicle-name">{v.name}</div>
                      <div className="dispatch-vehicle-ttx">{v.ttx}</div>
                      <div className="dispatch-vehicle-actions">
                        <label className="dispatch-qty-label">
                          Кол-во:
                          <input
                            type="number"
                            min={0}
                            value={dispatchQuantities[v.id] ?? 0}
                            onChange={(e) =>
                              handleDispatchQtyChange(v.id, e.target.value)
                            }
                          />
                        </label>
                        <label className="dispatch-eta-label">
                          Время след., мин:
                          <input
                            type="number"
                            min={1}
                            placeholder="мин"
                            value={dispatchEta[v.id] ?? ''}
                            onChange={(e) => handleDispatchEtaChange(v.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendDispatch(v)
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSendDispatch(v)}
                        >
                          Отправить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dispatch-sent-section">
                <h4>Отправленные расчёты</h4>
                {dispatches.length === 0 ? (
                  <p className="empty-state">Отправленных расчётов пока нет</p>
                ) : (
                  <div className="dispatch-sent-list">
                    {dispatches.map((d) => (
                      <div key={d.id} className="dispatch-sent-item">
                        <DispatchVehicleImage
                          vehicle={d.vehicle}
                          className="dispatch-sent-photo"
                        />
                        <div>
                          <strong>{d.vehicle.name}</strong> — {d.count} ед.,
                          время следования {d.eta} мин
                          <div className="dispatch-meta">Отправлено в {d.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="dispatcher-bottom">
            <section className="panel panel-protocol">
              <h3>Протокол действий диспетчера</h3>
              <div className="protocol-form">
                <input
                  type="text"
                  placeholder="Позывной"
                  value={protocolForm.callsign}
                  onChange={(e) => handleProtocolChange('callsign', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Действие"
                  value={protocolForm.action}
                  onChange={(e) => handleProtocolChange('action', e.target.value)}
                />
                <input
                  type="time"
                  value={protocolForm.time}
                  onChange={(e) => handleProtocolChange('time', e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleAddProtocolRow}>
                  Добавить
                </button>
              </div>
              <div className="protocol-table-wrapper">
                <table className="protocol-table">
                  <thead>
                    <tr>
                      <th>Позывной</th>
                      <th>Действие</th>
                      <th>Время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocolRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="empty-state">
                          Записей пока нет
                        </td>
                      </tr>
                    ) : (
                      protocolRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.callsign}</td>
                          <td>{row.action}</td>
                          <td>{row.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
      </div>
    </main>
  )
}

export default Dispatcher
