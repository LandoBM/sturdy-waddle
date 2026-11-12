import { describe, expect, it } from '@jest/globals'
import { activityDisplayRoutePoints, activityHasRecordedRoute, chooseDemoActivityRouteId, demoActivityRoutes, resolveActivityRoute } from './demoActivityRoutes'
import type { RecordedActivity } from './activity'

const activity = (overrides: Partial<RecordedActivity> = {}): RecordedActivity => ({
  id: 'activity-test',
  kind: 'Hiking',
  status: 'completed',
  startedAt: 1,
  endedAt: 2,
  segmentStartedAt: null,
  elapsedSeconds: 60,
  distanceMeters: 0,
  points: [],
  ...overrides,
})

describe('demo activity routes', () => {
  it('provides exactly six stable route designs', () => {
    expect(demoActivityRoutes).toHaveLength(6)
    expect(new Set(demoActivityRoutes.map((route) => route.id)).size).toBe(6)
  })

  it('avoids repeating the previous route and balances route usage', () => {
    const history = demoActivityRoutes.slice(0, 3).map((route, index) => activity({ id: `activity-${index}`, demoRouteId: route.id }))
    const next = chooseDemoActivityRouteId(history)
    expect(next).not.toBe(history[0].demoRouteId)
    expect(demoActivityRoutes.some((route) => route.id === next)).toBe(true)
  })

  it('uses real recorded points before demo points', () => {
    const realPoints = [
      { latitude: 34, longitude: -118, altitude: null, timestamp: 1 },
      { latitude: 34.001, longitude: -118.001, altitude: null, timestamp: 2 },
    ]
    const withRealRoute = activity({ points: realPoints, demoRouteId: demoActivityRoutes[0].id })
    expect(activityHasRecordedRoute(withRealRoute)).toBe(true)
    expect(activityDisplayRoutePoints(withRealRoute)).toEqual(realPoints)
    expect(activityDisplayRoutePoints(activity({ demoRouteId: demoActivityRoutes[0].id })).length).toBeGreaterThan(1)
  })

  it('resolves a stable demo route into the shared representation', () => {
    const resolved = resolveActivityRoute(activity({ demoRouteId: demoActivityRoutes[2].id }))
    expect(resolved.source).toBe('demo')
    expect(resolved.routeId).toBe(demoActivityRoutes[2].id)
    expect(resolved.label).toBe(demoActivityRoutes[2].label)
    expect(resolved.points.length).toBeGreaterThan(1)
  })
})
