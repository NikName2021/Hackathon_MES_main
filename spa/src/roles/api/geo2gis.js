/**
 * 2GIS API: геокодирование и маршрутизация.
 * Docs: https://dev.2gis.com/
 */
const API_KEY = 'c63d24f7-6ab3-4dc3-9739-1b4047a329c3'

export async function geocode(address) {
  const url = `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(address)}&fields=items.point&key=${API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.meta?.code !== 200 || !data.result?.items?.length) {
    throw new Error(data.meta?.error?.message || 'Адрес не найден')
  }
  const point = data.result.items[0].point
  return { lat: point.lat, lon: point.lon }
}

export async function getRouteDuration(fromAddress, toAddress) {
  const [from, to] = await Promise.all([geocode(fromAddress), geocode(toAddress)])
  const url = `https://routing.api.2gis.com/get_dist_matrix?key=${API_KEY}&version=2.0`
  const body = {
    points: [from, to],
    sources: [0],
    targets: [1],
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  const route = data.routes?.[0]
  if (!route || route.status !== 'OK') {
    throw new Error(route?.status === 'FAIL' ? 'Маршрут не найден' : 'Ошибка API')
  }
  return {
    durationMinutes: Math.round(route.duration / 60),
    firePoint: to,
    dispatchPoint: from,
  }
}
