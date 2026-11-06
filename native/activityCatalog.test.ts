import { describe, expect, it } from '@jest/globals'
import { activityCatalog, activityTracksRoute } from './activityCatalog'

describe('activity catalog', () => {
  it('includes the requested fitness activities', () => {
    const names = activityCatalog.map((activity) => activity.name)
    expect(names).toContain('Pilates')
    expect(names).toContain('Traditional Fitness')
    expect(names).toContain('Outdoor Yoga')
    expect(names).toContain('Kickboxing')
    expect(names).toContain('Muay Thai')
    expect(names).toContain('Hiking')
    expect(names).toContain('Running')
  })

  it('requests GPS only for route-based activities', () => {
    expect(activityTracksRoute('Hiking')).toBe(true)
    expect(activityTracksRoute('Running')).toBe(true)
    expect(activityTracksRoute('Pilates')).toBe(false)
    expect(activityTracksRoute('Traditional Fitness')).toBe(false)
  })
})
