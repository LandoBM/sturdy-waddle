import { describe, expect, it } from '@jest/globals'
import {
  calculateDistanceMeters,
  calculatePaceSecondsPerMile,
  formatActivityDistance,
  formatActivityDuration,
  formatPace,
} from './activityMetrics'

describe('activity metrics', () => {
  it('calculates route distance between GPS points', () => {
    const distance = calculateDistanceMeters(
      { latitude: 34.0522, longitude: -118.2437 },
      { latitude: 34.0614, longitude: -118.2437 },
    )

    expect(distance).toBeGreaterThan(1000)
    expect(distance).toBeLessThan(1100)
  })

  it('formats duration, distance, and pace', () => {
    expect(formatActivityDuration(3661)).toBe('1:01:01')
    expect(formatActivityDistance(1609.344)).toBe('1.00')
    expect(calculatePaceSecondsPerMile(1609.344, 600)).toBe(600)
    expect(formatPace(600)).toBe('10:00')
  })

  it('avoids displaying a pace before a GPS distance is available', () => {
    expect(calculatePaceSecondsPerMile(0, 60)).toBe(0)
    expect(formatPace(0)).toBe('--:--')
  })
})
