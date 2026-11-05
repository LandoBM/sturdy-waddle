import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { calculateDistanceMeters, COMPLETION_POINTS } from './activityMetrics'

export {
  COMPLETION_POINTS,
  calculatePaceSecondsPerMile,
  formatActivityDistance,
  formatActivityDuration,
  formatPace,
} from './activityMetrics'

export type ActivityKind = 'Hiking' | 'Running'
export type ActivityStatus = 'recording' | 'paused'

export interface ActivityPoint {
  latitude: number
  longitude: number
  altitude: number | null
  timestamp: number
}

export interface RecordedActivity {
  id: string
  kind: ActivityKind
  status: ActivityStatus | 'completed'
  startedAt: number
  endedAt?: number
  segmentStartedAt: number | null
  elapsedSeconds: number
  distanceMeters: number
  points: ActivityPoint[]
  earnedPoints?: number
}

export interface ActivityStore {
  active: RecordedActivity | null
  history: RecordedActivity[]
  points: number
}

export const ACTIVITY_LOCATION_TASK = 'outside-activity-location'
const ACTIVITY_STORE_KEY = 'outside.activity-store.v1'
const emptyStore = (): ActivityStore => ({ active: null, history: [], points: 0 })

export async function loadActivityStore(): Promise<ActivityStore> {
  const raw = await AsyncStorage.getItem(ACTIVITY_STORE_KEY)
  if (!raw) return emptyStore()
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('history' in parsed) ||
    !Array.isArray(parsed.history) ||
    !('points' in parsed) ||
    typeof parsed.points !== 'number'
  ) {
    throw new Error('Saved activity data is invalid. Clear app data or reinstall to reset it.')
  }
  return {
    active: 'active' in parsed && parsed.active ? parsed.active as RecordedActivity : null,
    history: parsed.history as RecordedActivity[],
    points: parsed.points,
  }
}

async function saveActivityStore(store: ActivityStore) {
  await AsyncStorage.setItem(ACTIVITY_STORE_KEY, JSON.stringify(store))
}

function appendLocation(activity: RecordedActivity, location: Location.LocationObject) {
  const accuracy = location.coords.accuracy
  if (accuracy !== null && accuracy > 60) return activity
  const point: ActivityPoint = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude,
    timestamp: location.timestamp,
  }
  const previous = activity.points[activity.points.length - 1]
  if (previous) {
    const distance = calculateDistanceMeters(previous, point)
    const seconds = (point.timestamp - previous.timestamp) / 1000
    if (seconds <= 0 || distance / seconds > 12) return activity
    if (distance < 2) return activity
    return {
      ...activity,
      distanceMeters: activity.distanceMeters + distance,
      points: [...activity.points, point],
    }
  }
  return { ...activity, points: [point] }
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  ACTIVITY_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) throw error
    const locations = data?.locations
    if (!locations?.length) return
    const store = await loadActivityStore()
    if (!store.active || store.active.status !== 'recording') return
    const updated = locations.reduce(appendLocation, store.active)
    if (updated !== store.active) await saveActivityStore({ ...store, active: updated })
  },
)

export async function getActivityStore() {
  return loadActivityStore()
}

export async function beginActivity(kind: ActivityKind) {
  if (await Location.hasServicesEnabledAsync() === false) {
    throw new Error('Turn on location services to record an activity.')
  }
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (foreground.status !== 'granted') throw new Error('Location permission is needed to record your route.')
  const background = await Location.requestBackgroundPermissionsAsync()
  if (background.status !== 'granted') {
    throw new Error('Allow background location to keep recording while your screen is locked.')
  }
  const store = await loadActivityStore()
  if (store.active) throw new Error('Finish or discard your current activity before starting another.')

  const now = Date.now()
  const activity: RecordedActivity = {
    id: `activity-${now}`,
    kind,
    status: 'recording',
    startedAt: now,
    segmentStartedAt: now,
    elapsedSeconds: 0,
    distanceMeters: 0,
    points: [],
  }
  await saveActivityStore({ ...store, active: activity })
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(ACTIVITY_LOCATION_TASK)
    if (registered) await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)
    await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 3000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Outside is recording your activity',
        notificationBody: 'Location is used to measure your route, distance, and duration.',
        killServiceOnDestroy: false,
      },
    })
  } catch (error) {
    await saveActivityStore({ ...store, active: null })
    throw error
  }
  return activity
}

export async function pauseActivity() {
  const store = await loadActivityStore()
  const active = store.active
  if (!active || active.status !== 'recording') return active
  if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)
  }
  const now = Date.now()
  const paused: RecordedActivity = {
    ...active,
    status: 'paused',
    segmentStartedAt: null,
    elapsedSeconds: active.elapsedSeconds + Math.max(0, Math.floor((now - (active.segmentStartedAt ?? now)) / 1000)),
  }
  await saveActivityStore({ ...store, active: paused })
  return paused
}

export async function resumeActivity() {
  const store = await loadActivityStore()
  const active = store.active
  if (!active || active.status !== 'paused') return active
  const foreground = await Location.getForegroundPermissionsAsync()
  const background = await Location.getBackgroundPermissionsAsync()
  if (foreground.status !== 'granted' || background.status !== 'granted') {
    throw new Error('Location permissions changed. Re-enable foreground and background access in Settings.')
  }
  const resumed: RecordedActivity = { ...active, status: 'recording', segmentStartedAt: Date.now() }
  await saveActivityStore({ ...store, active: resumed })
  try {
    await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 3000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Outside is recording your activity',
        notificationBody: 'Location is used to measure your route, distance, and duration.',
        killServiceOnDestroy: false,
      },
    })
  } catch (error) {
    await saveActivityStore({ ...store, active })
    throw error
  }
  return resumed
}

export async function finishActivity() {
  const store = await loadActivityStore()
  const active = store.active
  if (!active) return null
  if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)
  }
  const now = Date.now()
  const elapsedSeconds = active.elapsedSeconds + (
    active.status === 'recording'
      ? Math.max(0, Math.floor((now - (active.segmentStartedAt ?? now)) / 1000))
      : 0
  )
  const completed: RecordedActivity = {
    ...active,
    status: 'completed',
    endedAt: now,
    segmentStartedAt: null,
    elapsedSeconds,
    earnedPoints: COMPLETION_POINTS,
  }
  await saveActivityStore({
    active: null,
    history: [completed, ...store.history],
    points: store.points + COMPLETION_POINTS,
  })
  return completed
}

export async function discardActivity() {
  const store = await loadActivityStore()
  if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)
  }
  await saveActivityStore({ ...store, active: null })
}
