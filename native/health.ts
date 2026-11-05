import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

export interface ImportedWorkout {
  id: string
  source: string
  title: string
  startedAt: string
  durationSeconds: number
  distanceMeters?: number
  calories?: number
  averageHeartRate?: number
}

const HEALTH_WORKOUTS_KEY = 'outside.health-workouts.v1'
const HEALTH_PROVIDER_KEY = 'outside.health-provider.v1'

export async function loadHealthProvider(): Promise<string | null> {
  return AsyncStorage.getItem(HEALTH_PROVIDER_KEY)
}

export async function saveHealthProvider(provider: string | null) {
  if (provider) await AsyncStorage.setItem(HEALTH_PROVIDER_KEY, provider)
  else await AsyncStorage.removeItem(HEALTH_PROVIDER_KEY)
}

export async function loadImportedWorkouts(): Promise<ImportedWorkout[]> {
  const raw = await AsyncStorage.getItem(HEALTH_WORKOUTS_KEY)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Saved connected workouts are invalid.')
  return parsed as ImportedWorkout[]
}

async function saveImportedWorkouts(workouts: ImportedWorkout[]) {
  const current = await loadImportedWorkouts()
  const merged = new Map(current.map((workout) => [workout.id, workout]))
  for (const workout of workouts) merged.set(workout.id, workout)
  const latest = [...merged.values()]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, 100)
  await AsyncStorage.setItem(HEALTH_WORKOUTS_KEY, JSON.stringify(latest))
  return latest
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0)
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : undefined
}

function overlaps(start: string, end: string, from: string, to: string) {
  return Date.parse(start) < Date.parse(to) && Date.parse(end) > Date.parse(from)
}

async function syncAppleHealth(): Promise<ImportedWorkout[]> {
  const healthkit = await import('@kingstinct/react-native-healthkit')
  if (!(await healthkit.isHealthDataAvailableAsync())) {
    throw new Error('Apple Health is not available on this device.')
  }
  const authorized = await healthkit.requestAuthorization({
    toRead: [
      'HKWorkoutTypeIdentifier',
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
    ],
  })
  if (!authorized) throw new Error('Apple Health authorization could not be completed.')

  const workouts = await healthkit.queryWorkoutSamples({
    limit: 100,
    ascending: false,
    filter: { date: { startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
  })
  return Promise.all(workouts.map(async (workout) => {
    const [heartRate, distance, energy] = await Promise.all([
      workout.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min'),
      workout.getStatistic('HKQuantityTypeIdentifierDistanceWalkingRunning', 'mi'),
      workout.getStatistic('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal'),
    ])
    const start = workout.startDate
    const end = workout.endDate
    return {
      id: workout.uuid,
      source: 'Apple Health',
      title: `Workout · ${String(workout.workoutActivityType)}`,
      startedAt: start.toISOString(),
      durationSeconds: Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)),
      distanceMeters: distance?.sumQuantity ? distance.sumQuantity.quantity * 1609.344 : undefined,
      calories: energy?.sumQuantity?.quantity,
      averageHeartRate: heartRate?.averageQuantity?.quantity,
    }
  }))
}

async function syncHealthConnect(): Promise<ImportedWorkout[]> {
  const healthConnect = await import('react-native-health-connect')
  if (!(await healthConnect.initialize())) {
    throw new Error('Health Connect is not available. Install or update it, then try again.')
  }

  const requested = await healthConnect.requestPermission([
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  ])
  const granted = new Set(requested.map((permission) => `${permission.accessType}:${permission.recordType}`))
  if (!granted.has('read:ExerciseSession')) {
    throw new Error('Allow workout access in Health Connect to import completed activities.')
  }

  const startTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const endTime = new Date().toISOString()
  const filter = { timeRangeFilter: { operator: 'between' as const, startTime, endTime }, pageSize: 1000 }

  async function readAll<T extends import('react-native-health-connect').RecordType>(recordType: T) {
    const records: import('react-native-health-connect').ReadRecordsResult<T>['records'] = []
    let pageToken: string | undefined
    do {
      const page = await healthConnect.readRecords(recordType, { ...filter, ...(pageToken ? { pageToken } : {}) })
      records.push(...page.records)
      pageToken = page.pageToken
    } while (pageToken)
    return records
  }

  const sessions = await readAll('ExerciseSession')
  const [heartRates, distances, calories] = await Promise.all([
    granted.has('read:HeartRate') ? readAll('HeartRate') : Promise.resolve([]),
    granted.has('read:Distance') ? readAll('Distance') : Promise.resolve([]),
    granted.has('read:ActiveCaloriesBurned') ? readAll('ActiveCaloriesBurned') : Promise.resolve([]),
  ])

  return sessions.map((session) => {
    const inSession = <T extends { startTime: string; endTime: string }>(record: T) =>
      overlaps(record.startTime, record.endTime, session.startTime, session.endTime)
    const heartValues = heartRates
      .filter(inSession)
      .flatMap((record) => record.samples.map((sample) => sample.beatsPerMinute))
    const sessionDistance = distances
      .filter(inSession)
      .reduce((total, record) => total + record.distance.inMeters, 0)
    const sessionCalories = calories
      .filter(inSession)
      .reduce((total, record) => total + record.energy.inKilocalories, 0)
    const source = session.metadata?.dataOrigin ?? 'Health Connect'
    return {
      id: session.metadata?.id ?? `${source}:${session.startTime}:${session.exerciseType}`,
      source,
      title: session.title || `Workout · ${session.exerciseType}`,
      startedAt: session.startTime,
      durationSeconds: Math.max(0, Math.round((Date.parse(session.endTime) - Date.parse(session.startTime)) / 1000)),
      distanceMeters: sessionDistance || undefined,
      calories: sessionCalories || undefined,
      averageHeartRate: average(heartValues),
    }
  })
}

export async function syncHealthWorkouts() {
  if (Platform.OS === 'ios') return saveImportedWorkouts(await syncAppleHealth())
  if (Platform.OS === 'android') return saveImportedWorkouts(await syncHealthConnect())
  throw new Error('Connect Apple Health or Health Connect from an iPhone or Android device.')
}
