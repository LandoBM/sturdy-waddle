import { describe, expect, it } from '@jest/globals'
import { groupRecentActivityDays, mergeActivityHistory } from './activityHistory'
import type { RecordedActivity } from './activity'

const activity = (id: string, endedAt: number): RecordedActivity => ({
  id,
  kind: 'Hiking',
  status: 'completed',
  startedAt: endedAt - 60000,
  endedAt,
  segmentStartedAt: null,
  elapsedSeconds: 60,
  distanceMeters: 0,
  points: [],
  earnedPoints: 10,
})

describe('activity history', () => {
  const now = new Date(2026, 10, 12, 12, 0, 0)

  it('groups every activity into the user local Today/Yesterday/Two days ago bucket', () => {
    const groups = groupRecentActivityDays([
      activity('today-1', new Date(2026, 10, 12, 8).getTime()),
      activity('today-2', new Date(2026, 10, 12, 9).getTime()),
      activity('yesterday', new Date(2026, 10, 11, 18).getTime()),
      activity('two-days-ago', new Date(2026, 10, 10, 7).getTime()),
      activity('older', new Date(2026, 10, 9, 7).getTime()),
    ], now)

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', 'Two days ago'])
    expect(groups[0].activities.map((item) => item.id)).toEqual(['today-2', 'today-1'])
    expect(groups[1].activities.map((item) => item.id)).toEqual(['yesterday'])
    expect(groups[2].activities.map((item) => item.id)).toEqual(['two-days-ago'])
    expect(groups.flatMap((group) => group.activities).some((item) => item.id === 'older')).toBe(false)
  })

  it('merges by stable activity ID without duplicating records', () => {
    const local = activity('same-id', 2)
    const remote = activity('same-id', 1)
    const merged = mergeActivityHistory([local], [remote, activity('remote-only', 3)])
    expect(merged.map((item) => item.id)).toEqual(['remote-only', 'same-id'])
    expect(merged.find((item) => item.id === 'same-id')?.endedAt).toBe(2)
  })
})
