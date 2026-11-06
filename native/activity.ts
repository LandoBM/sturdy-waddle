import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { activityTracksRoute, type ActivityKind } from './activityCatalog'
import { calculateDistanceMeters, COMPLETION_POINTS } from './activityMetrics'

export {
  COMPLETION_POINTS,
  calculatePaceSecondsPerMile,
  formatActivityDistance,
  formatActivityDuration,
  formatPace,
} from './activityMetrics'

export type { ActivityKind } from './activityCatalog'
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
const ACTIVE_ACTIVITY_USER_KEY = 'outside.activity-owner.v1'
let activityUserId = 'anonymous'
const emptyStore = (): ActivityStore => ({ active: null, history: [], points: 0 })

export function setActivityUserId(userId: string | null) {
  activityUserId = userId ?? 'anonymous'
}

function activityStoreKey(userId: string) {
  return `${ACTIVITY_STORE_KEY}.${userId}`
}

export async function loadActivityStore(userId = activityUserId): Promise<ActivityStore> {
  const raw = await AsyncStorage.getItem(activityStoreKey(userId))
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

async function saveActivityStore(store: ActivityStore, userId = activityUserId) {
  await AsyncStorage.setItem(activityStoreKey(userId), JSON.stringify(store))
  if (store.active) {
    await AsyncStorage.setItem(ACTIVE_ACTIVITY_USER_KEY, userId)
  } else if (await AsyncStorage.getItem(ACTIVE_ACTIVITY_USER_KEY) === userId) {
    await AsyncStorage.removeItem(ACTIVE_ACTIVITY_USER_KEY)
  }
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
    const userId = await AsyncStorage.getItem(ACTIVE_ACTIVITY_USER_KEY)
    if (!userId) return
    const store = await loadActivityStore(userId)
    if (!store.active || store.active.status !== 'recording') return
    const updated = locations.reduce(appendLocation, store.active)
    if (updated !== store.active) await saveActivityStore({ ...store, active: updated }, userId)
  },
)

export async function getActivityStore() {
  return loadActivityStore()
}

export async function beginActivity(kind: ActivityKind) {
  const activeUserId = await AsyncStorage.getItem(ACTIVE_ACTIVITY_USER_KEY)
  if (activeUserId && activeUserId !== activityUserId) {
    throw new Error('Another signed-in account has an activity in progress. Sign in to that account and finish it first.')
  }
  const store = await loadActivityStore()
  if (store.active) throw new Error('Finish or discard your current activity before starting another.')
  const tracksRoute = activityTracksRoute(kind)
  if (tracksRoute) {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new Error('Turn on location services to record an activity.')
    }
    const foreground = await Location.requestForegroundPermissionsAsync()
    if (foreground.status !== 'granted') throw new Error('Location permission is needed to record your route.')
    // Expo Go may not expose the native background-location permission flow.
    // Foreground permission is enough to start tracking while the app is open;
    // standalone/dev builds will additionally request background access.
    try {
      await Location.requestBackgroundPermissionsAsync()
    } catch {
      // Continue with foreground tracking when the current runtime cannot grant background access.
    }
  }

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
  if (tracksRoute) {
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
          notificationTitle: 'FitHive is recording your activity',
          notificationBody: 'Location is used to measure your route, distance, and duration.',
          killServiceOnDestroy: false,
        },
      })
    } catch (error) {
      await saveActivityStore({ ...store, active: null })
      throw error
    }
  }
  return activity
}

export async function pauseActivity() {
  const store = await loadActivityStore()
  const active = store.active
  if (!active || active.status !== 'recording') return active
  if (activityTracksRoute(active.kind) && await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
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
  const tracksRoute = activityTracksRoute(active.kind)
  if (tracksRoute) {
    const foreground = await Location.getForegroundPermissionsAsync()
    const background = await Location.getBackgroundPermissionsAsync()
    if (foreground.status !== 'granted' || background.status !== 'granted') {
      throw new Error('Location permissions changed. Re-enable foreground and background access in Settings.')
    }
  }
  const resumed: RecordedActivity = { ...active, status: 'recording', segmentStartedAt: Date.now() }
  await saveActivityStore({ ...store, active: resumed })
  if (tracksRoute) {
    try {
      await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'FitHive is recording your activity',
          notificationBody: 'Location is used to measure your route, distance, and duration.',
          killServiceOnDestroy: false,
        },
      })
    } catch (error) {
      await saveActivityStore({ ...store, active })
      throw error
    }
  }
  return resumed
}

export async function finishActivity() {
  const store = await loadActivityStore()
  const active = store.active
  if (!active) return null
  if (activityTracksRoute(active.kind) && await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
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
  if (store.active && activityTracksRoute(store.active.kind) && await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)
  }
  await saveActivityStore({ ...store, active: null })
}
