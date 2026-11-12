import type { ActivityPoint, RecordedActivity } from './activity'

export type DemoActivityRoute = {
  id: string
  label: string
  sport: string
  points: Array<[number, number]>
}

export type ResolvedActivityRoute = {
  source: 'gps' | 'demo' | 'none'
  routeId?: string
  label?: string
  points: ActivityPoint[]
}

// Display-only route designs. Their points are generated in memory and are
// never written into a completed activity as GPS data.
export const demoActivityRoutes: DemoActivityRoute[] = [
  { id: 'alpine-ridge-traverse', label: 'Alpine Ridge Traverse', sport: 'Mountain biking', points: [[0.03, 0.84], [0.12, 0.68], [0.18, 0.72], [0.27, 0.42], [0.39, 0.5], [0.5, 0.2], [0.63, 0.33], [0.76, 0.12], [0.94, 0.2]] },
  { id: 'coastal-tide-loop', label: 'Coastal Tide Loop', sport: 'Paddleboarding', points: [[0.08, 0.64], [0.19, 0.38], [0.34, 0.24], [0.51, 0.3], [0.64, 0.56], [0.78, 0.72], [0.91, 0.58], [0.82, 0.34], [0.68, 0.16], [0.49, 0.08], [0.3, 0.14], [0.15, 0.32]] },
  { id: 'canyon-switchback-run', label: 'Canyon Switchback Run', sport: 'Trail running', points: [[0.04, 0.88], [0.2, 0.76], [0.1, 0.61], [0.31, 0.51], [0.2, 0.36], [0.46, 0.28], [0.38, 0.12], [0.65, 0.1], [0.79, 0.24], [0.94, 0.16]] },
  { id: 'forest-canopy-ride', label: 'Forest Canopy Ride', sport: 'Gravel cycling', points: [[0.04, 0.2], [0.17, 0.12], [0.27, 0.3], [0.23, 0.52], [0.39, 0.72], [0.55, 0.6], [0.68, 0.78], [0.83, 0.66], [0.95, 0.82]] },
  { id: 'lake-island-paddle', label: 'Lake Island Paddle', sport: 'Kayaking', points: [[0.08, 0.72], [0.16, 0.44], [0.32, 0.3], [0.48, 0.38], [0.6, 0.62], [0.75, 0.72], [0.9, 0.58], [0.82, 0.36], [0.64, 0.22], [0.46, 0.18], [0.28, 0.26], [0.14, 0.46]] },
  { id: 'summit-ski-descent', label: 'Summit Ski Descent', sport: 'Skiing', points: [[0.08, 0.12], [0.18, 0.26], [0.1, 0.42], [0.27, 0.5], [0.2, 0.68], [0.4, 0.78], [0.36, 0.9], [0.62, 0.84], [0.74, 0.7], [0.68, 0.54], [0.86, 0.42], [0.94, 0.22]] },
]

const routeById = new Map(demoActivityRoutes.map((route) => [route.id, route]))

export function getDemoActivityRoute(routeId?: string | null) {
  return routeId ? routeById.get(routeId) : undefined
}

export function chooseDemoActivityRouteId(history: RecordedActivity[]) {
  const previousRouteId = history[0]?.demoRouteId
  const counts = new Map(demoActivityRoutes.map((route) => [route.id, 0]))
  history.forEach((activity) => {
    if (activity.demoRouteId && counts.has(activity.demoRouteId)) counts.set(activity.demoRouteId, (counts.get(activity.demoRouteId) ?? 0) + 1)
  })
  const minimumCount = Math.min(...counts.values())
  const candidates = demoActivityRoutes.filter((route) => counts.get(route.id) === minimumCount && route.id !== previousRouteId)
  const pool = candidates.length ? candidates : demoActivityRoutes.filter((route) => route.id !== previousRouteId)
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? demoActivityRoutes[0].id
}

export function stableDemoActivityRouteId(seed: string) {
  const hash = Array.from(seed).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 7)
  return demoActivityRoutes[Math.abs(hash) % demoActivityRoutes.length].id
}

function pointFromDesign([x, y]: [number, number], index: number): ActivityPoint {
  return { latitude: 34.02 + y * 0.08, longitude: -118.5 + x * 0.12, altitude: null, timestamp: index * 60_000 }
}

export function demoActivityRoutePoints(routeId?: string | null) {
  return getDemoActivityRoute(routeId)?.points.map(pointFromDesign) ?? []
}

export function activityHasRecordedRoute(activity: RecordedActivity) {
  return activity.points.length > 1 && activity.points.every((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
}

export function activityDisplayRoutePoints(activity: RecordedActivity) {
  return resolveActivityRoute(activity).points
}

export function activityUsesDemoRoute(activity: RecordedActivity) {
  return resolveActivityRoute(activity).source === 'demo'
}

export function resolveActivityRoute(activity: RecordedActivity): ResolvedActivityRoute {
  if (activityHasRecordedRoute(activity)) {
    return { source: 'gps', routeId: 'recorded-gps', points: activity.points }
  }

  const demoRoute = getDemoActivityRoute(activity.demoRouteId)
  if (demoRoute) {
    return {
      source: 'demo',
      routeId: demoRoute.id,
      label: demoRoute.label,
      points: demoActivityRoutePoints(demoRoute.id),
    }
  }

  return { source: 'none', points: [] }
}
