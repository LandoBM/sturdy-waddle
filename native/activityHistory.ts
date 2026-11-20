import type { RecordedActivity } from './activity'

export const activityCompletionTimestamp = (activity: Pick<RecordedActivity, 'endedAt' | 'startedAt'>) => activity.endedAt ?? activity.startedAt

export const activityLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type RecentActivityDay = {
  key: string
  label: 'Today' | 'Yesterday' | 'Two days ago'
  activities: RecordedActivity[]
}

export function groupRecentActivityDays(history: RecordedActivity[], now = new Date()): RecentActivityDay[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return (['Today', 'Yesterday', 'Two days ago'] as const).map((label, offset) => {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = activityLocalDateKey(date)
    return {
      key,
      label,
      activities: history
        .filter((activity) => activityLocalDateKey(new Date(activityCompletionTimestamp(activity))) === key)
        .sort((left, right) => activityCompletionTimestamp(right) - activityCompletionTimestamp(left)),
    }
  })
}

export function mergeActivityHistory(local: RecordedActivity[], remote: RecordedActivity[]) {
  const merged = new Map<string, RecordedActivity>()
  remote.forEach((activity) => merged.set(activity.id, activity))
  local.forEach((activity) => merged.set(activity.id, activity))
  return [...merged.values()].sort((left, right) => activityCompletionTimestamp(right) - activityCompletionTimestamp(left))
}
