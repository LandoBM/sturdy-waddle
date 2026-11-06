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

export interface DailyFitnessMetrics {
  date: string
  moveCalories: number
  exerciseMinutes: number
  standHours: number
  source: string
}

const HEALTH_WORKOUTS_KEY = 'outside.health-workouts.v1'
const HEALTH_PROVIDER_KEY = 'outside.health-provider.v1'
const DAILY_METRICS_KEY = 'outside.daily-fitness-metrics.v1'
let healthUserId = 'anonymous'

export function setHealthUserId(userId: string | null) {
  healthUserId = userId ?? 'anonymous'
}

function userStorageKey(key: string) {
  return `${key}.${healthUserId}`
}

export async function loadHealthProvider(): Promise<string | null> {
  return AsyncStorage.getItem(userStorageKey(HEALTH_PROVIDER_KEY))
}

export async function saveHealthProvider(provider: string | null) {
  const key = userStorageKey(HEALTH_PROVIDER_KEY)
  if (provider) await AsyncStorage.setItem(key, provider)
  else await AsyncStorage.removeItem(key)
}

export async function loadDailyFitnessMetrics(): Promise<DailyFitnessMetrics | null> {
  const raw = await AsyncStorage.getItem(userStorageKey(DAILY_METRICS_KEY))
  if (!raw) return null
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('Saved daily fitness metrics are invalid.')
  const metrics = parsed as DailyFitnessMetrics
  if (
    typeof metrics.date !== 'string'
    || !Number.isFinite(metrics.moveCalories)
    || !Number.isFinite(metrics.exerciseMinutes)
    || !Number.isFinite(metrics.standHours)
    || typeof metrics.source !== 'string'
  ) throw new Error('Saved daily fitness metrics are invalid.')
  return metrics.date === localDateKey(new Date()) ? metrics : null
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function saveDailyFitnessMetrics(metrics: DailyFitnessMetrics) {
  await AsyncStorage.setItem(userStorageKey(DAILY_METRICS_KEY), JSON.stringify(metrics))
  return metrics
}

async function syncAppleFitnessMetrics(): Promise<DailyFitnessMetrics> {
  const healthkit = await import('@kingstinct/react-native-healthkit')
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const samples = await Promise.all([
    healthkit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      limit: 1000,
      filter: { date: { startDate: start, endDate: end } },
      unit: 'kcal',
    }),
    healthkit.queryQuantitySamples('HKQuantityTypeIdentifierAppleExerciseTime', {
      limit: 1000,
      filter: { date: { startDate: start, endDate: end } },
      unit: 'min',
    }),
    healthkit.queryQuantitySamples('HKQuantityTypeIdentifierAppleStandTime', {
      limit: 1000,
      filter: { date: { startDate: start, endDate: end } },
      unit: 'min',
    }),
  ])
  return saveDailyFitnessMetrics({
    date: localDateKey(start),
    moveCalories: Math.round(samples[0].reduce((total, sample) => total + sample.quantity, 0)),
    exerciseMinutes: Math.round(samples[1].reduce((total, sample) => total + sample.quantity, 0)),
    standHours: new Set(samples[2].filter((sample) => sample.quantity > 0).map((sample) => sample.startDate.getHours())).size,
    source: 'Apple Health',
  })
}

async function syncHealthConnectMetrics(): Promise<DailyFitnessMetrics> {
  const healthConnect = await import('react-native-health-connect')
  if (!(await healthConnect.initialize())) {
    throw new Error('Health Connect is not available. Install or update it, then try again.')
  }
  const permissions = await healthConnect.requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'ExerciseSession' },
  ])
  const granted = new Set(permissions.map((permission) => `${permission.accessType}:${permission.recordType}`))
  const requiredPermissions = ['read:ExerciseSession', 'read:Steps', 'read:ActiveCaloriesBurned']
  if (requiredPermissions.some((permission) => !granted.has(permission))) {
    throw new Error('Allow access to workouts, steps, and active calories in Health Connect to sync all movement rings.')
  }
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const filter = {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
    pageSize: 1000,
  }
  const [exercise, steps, energy] = await Promise.all([
    healthConnect.readRecords('ExerciseSession', filter),
    healthConnect.readRecords('Steps', filter),
    healthConnect.readRecords('ActiveCaloriesBurned', filter),
  ])
  const exerciseMinutes = exercise.records.reduce((total, record) => (
    total + Math.max(0, Date.parse(record.endTime) - Date.parse(record.startTime)) / 60000
  ), 0)
  const standHours = new Set(steps.records.filter((record) => record.count > 0).map((record) => (
    new Date(record.startTime).getHours()
  ))).size
  const moveCalories = energy.records.reduce((total, record) => total + record.energy.inKilocalories, 0)
  return saveDailyFitnessMetrics({
    date: localDateKey(start),
    moveCalories: Math.round(moveCalories),
    exerciseMinutes: Math.round(exerciseMinutes),
    standHours,
    source: 'Health Connect',
  })
}

export async function syncDailyFitnessMetrics(): Promise<DailyFitnessMetrics> {
  if (Platform.OS === 'ios') return syncAppleFitnessMetrics()
  if (Platform.OS === 'android') return syncHealthConnectMetrics()
  throw new Error('Daily fitness rings require Apple Health or Health Connect on a mobile device.')
}

export async function loadImportedWorkouts(): Promise<ImportedWorkout[]> {
  const raw = await AsyncStorage.getItem(userStorageKey(HEALTH_WORKOUTS_KEY))
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
  await AsyncStorage.setItem(userStorageKey(HEALTH_WORKOUTS_KEY), JSON.stringify(latest))
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
      'HKQuantityTypeIdentifierAppleExerciseTime',
      'HKQuantityTypeIdentifierAppleStandTime',
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
