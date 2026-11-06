import { Ionicons } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library'
import { useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import Svg, { Circle, Polyline } from 'react-native-svg'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { type ActivityKind, type ActivityPoint, type ActivityStore, type RecordedActivity } from './activity'
import { activityCatalog, activityTracksRoute } from './activityCatalog'
import { RouteMap } from './RouteMap'
import { FitnessRings, type FitnessRingValues } from './FitnessRings'
import {
  calculatePaceSecondsPerMile,
  COMPLETION_POINTS,
  formatActivityDistance,
  formatActivityDuration,
  formatPace,
} from './activityMetrics'

const ink = '#151712'
const muted = '#73776d'
const lime = '#d9ff5a'
const line = '#dedfd7'
const white = '#ffffff'
const { captureRef } = require('react-native-view-shot') as {
  captureRef: (target: any, options: Record<string, unknown>) => Promise<string>
}

function routePolyline(points: RecordedActivity['points'], width: number, height: number) {
  if (points.length < 2) return ''
  const latitudes = points.map((point) => point.latitude)
  const longitudes = points.map((point) => point.longitude)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)
  const latSpan = Math.max(maxLat - minLat, 0.0001)
  const lonSpan = Math.max(maxLon - minLon, 0.0001)
  const padding = 26
  const scale = Math.min((width - padding * 2) / lonSpan, (height - padding * 2) / latSpan)
  const offsetX = (width - lonSpan * scale) / 2
  const offsetY = (height - latSpan * scale) / 2
  return points.map((point) => `${offsetX + (point.longitude - minLon) * scale},${height - offsetY - (point.latitude - minLat) * scale}`).join(' ')
}

function demoRoutePoints(activity: RecordedActivity): ActivityPoint[] {
  const seed = [...activity.id].reduce((total, character) => total + character.charCodeAt(0), 0)
  const routes = [
    [[0, 0], [0.14, 0.06], [0.28, 0.2], [0.2, 0.36], [0.02, 0.44], [-0.16, 0.32], [-0.22, 0.12], [-0.08, -0.02], [0.12, -0.08], [0.28, 0.02]],
    [[0, 0], [0.1, 0.16], [0.24, 0.26], [0.38, 0.16], [0.46, -0.02], [0.36, -0.18], [0.18, -0.24], [0.02, -0.12], [-0.1, 0.06], [-0.02, 0.22]],
    [[0, 0], [0.16, 0.02], [0.08, 0.16], [0.26, 0.24], [0.18, 0.4], [0.02, 0.34], [-0.06, 0.5], [-0.22, 0.38], [-0.12, 0.2], [-0.24, 0.04]],
  ] as const
  const route = routes[seed % routes.length]
  const latitude = 34.04 + (seed % 30) / 1000
  const longitude = -118.25 - (seed % 25) / 1000
  return route.map(([x, y], index) => ({
    latitude: latitude + y / 100,
    longitude: longitude + x / 100,
    altitude: null,
    timestamp: activity.startedAt + index * 60_000,
  }))
}

function RouteExportCard({ activity, captureTarget }: { activity: RecordedActivity; captureTarget: Ref<any> }) {
  const { width } = useWindowDimensions()
  const cardWidth = Math.min(width - 36, 360)
  const routeHeight = 230
  const hasRecordedRoute = activity.points.length > 1
  const routePoints = hasRecordedRoute ? activity.points : demoRoutePoints(activity)
  const polyline = routePolyline(routePoints, cardWidth, routeHeight)
  return (
    <View ref={captureTarget} collapsable={false} style={[styles.exportCard, { width: cardWidth }]}>
      <View style={styles.exportHeader}>
        <Text style={styles.exportLogo}>FitHive</Text>
        <Text style={styles.exportActivity}>{activity.kind.toUpperCase()}</Text>
      </View>
      <Svg width={cardWidth} height={routeHeight} viewBox={`0 0 ${cardWidth} ${routeHeight}`}>
        <Circle cx={12} cy={routeHeight - 14} r={5} fill="#a447e8" />
        {polyline ? <Polyline points={polyline} fill="none" stroke="#a447e8" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        <Circle cx={cardWidth - 12} cy={14} r={5} fill="#ff6c48" />
      </Svg>
      <View style={styles.exportStats}>
        <View><Text style={styles.exportValue}>{formatActivityDistance(activity.distanceMeters)} mi</Text><Text style={styles.exportLabel}>DISTANCE</Text></View>
        <View><Text style={styles.exportValue}>{formatActivityDuration(activity.elapsedSeconds)}</Text><Text style={styles.exportLabel}>TIME</Text></View>
        <View><Text style={styles.exportValue}>{formatPace(calculatePaceSecondsPerMile(activity.distanceMeters, activity.elapsedSeconds))}</Text><Text style={styles.exportLabel}>AVG PACE</Text></View>
      </View>
      <Text style={styles.exportDate}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      {!hasRecordedRoute ? <Text style={styles.exportNoRoute}>Preview route · GPS points were not saved for this activity.</Text> : null}
    </View>
  )
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}</Text>
    </View>
  )
}

export function ActivityScreen({
  store,
  elapsedSeconds,
  onStart,
  onPause,
  onResume,
  onFinish,
  ringMetrics,
  bottomTabs,
}: {
  store: ActivityStore
  elapsedSeconds: number
  onStart: (kind: ActivityKind) => void
  onPause: () => void
  onResume: () => void
  onFinish: () => void
  ringMetrics: FitnessRingValues
  bottomTabs?: ReactNode
}) {
  const [kind, setKind] = useState<ActivityKind>('Hiking')
  const [activitySearch, setActivitySearch] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<RecordedActivity | null>(null)
  const routeExportRef = useRef<any>(null)
  const active = store.active
  const visibleActivities = useMemo(
    () => activityCatalog
      .filter((item) => item.name.toLowerCase().includes(activitySearch.trim().toLowerCase()))
      .slice(0, 6),
    [activitySearch],
  )

  return (
    <ScrollView className="flex-1 bg-[#f4f7f1] dark:bg-[#07110d]" contentContainerClassName="px-[18px] pb-8 pt-5">
      <Text className="text-[29px] font-extrabold tracking-[-1px] text-ink dark:text-[#f3f7f0]">Activity tracker</Text>
      <Text className="mb-4 mt-1.5 text-[13px] leading-[19px] text-slate-500 dark:text-[#9eafa2]">Track a workout, walk, run, or any activity that keeps you moving.</Text>

      <View className="mb-4 flex-row items-center gap-3 rounded-[22px] border border-accent-200 bg-[#e9f6a9] p-3.5 shadow-md dark:border-[#4b6138] dark:bg-[#16281c]">
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#efffae]"><Ionicons name="trophy" size={21} color={ink} /></View>
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-ink dark:text-[#f3f7f0]">{store.points} points earned</Text>
          <Text className="mt-0.5 text-[10px] text-[#4d5830] dark:text-[#9eafa2]">+{COMPLETION_POINTS} points for every completed activity</Text>
        </View>
      </View>

      <View className="mb-5 rounded-[26px] border border-[#dfe7d9] bg-white p-4 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]">
        <Text className="text-[17px] font-extrabold text-ink dark:text-[#f3f7f0]">Today’s activity</Text>
        <Text className="mt-1 text-[11px] leading-[17px] text-slate-500 dark:text-[#9eafa2]">Close your three rings with movement, exercise, and active time.</Text>
        <FitnessRings values={ringMetrics} compact />
      </View>

      {active ? (
        <View style={styles.activeCard}>
          <View style={styles.activeTop}>
            <View>
              <Text style={styles.eyebrow}>{active.status === 'recording' ? 'RECORDING' : 'PAUSED'}</Text>
              <Text style={styles.activeTitle}>{active.kind}</Text>
            </View>
            <View style={[styles.recordingIndicator, active.status === 'paused' && styles.pausedIndicator]} />
          </View>
          <View style={styles.metricsRow}>
            {activityTracksRoute(active.kind) && <Metric label="DISTANCE" value={formatActivityDistance(active.distanceMeters)} unit="mi" />}
            <Metric label="DURATION" value={formatActivityDuration(elapsedSeconds)} />
            {activityTracksRoute(active.kind) && <Metric label="AVG PACE" value={formatPace(calculatePaceSecondsPerMile(active.distanceMeters, elapsedSeconds))} unit="/mi" />}
          </View>
          {activityTracksRoute(active.kind) && <View style={styles.graphCard}><Text style={styles.graphTitle}>Your route</Text><RouteMap points={active.points} /></View>}
          <View style={styles.controls}>
            {active.status === 'recording' ? (
              <Pressable onPress={onPause} style={styles.pauseButton}>
                <Ionicons name="pause" size={18} color={ink} />
                <Text style={styles.controlText}>Pause</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onResume} style={styles.resumeButton}>
                <Ionicons name="play" size={18} color={ink} />
                <Text style={styles.controlText}>Resume</Text>
              </Pressable>
            )}
            <Pressable onPress={onFinish} style={styles.finishButton}>
              <Ionicons name="stop" size={18} color={white} />
              <Text style={styles.finishText}>Finish activity</Text>
            </Pressable>
          </View>
          <Text style={styles.backgroundNote}>{activityTracksRoute(active.kind) ? 'GPS stays on in the background while recording. A system location indicator remains visible.' : 'This activity records your elapsed time without collecting location.'}</Text>
        </View>
      ) : (
        <View className="rounded-[26px] border border-[#dfe7d9] bg-white p-4 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]">
          <Text className="text-[17px] font-extrabold text-ink dark:text-[#f3f7f0]">Start an activity</Text>
          <Text className="mt-1 text-[11px] leading-[17px] text-slate-500 dark:text-[#9eafa2]">Pick an activity below to start tracking.</Text>
          <TextInput value={activitySearch} onChangeText={setActivitySearch} placeholder="Search activities" placeholderTextColor={muted} className="mt-3 h-[46px] rounded-[16px] border border-[#dfe7d9] bg-[#fbfdf9] px-3 text-ink dark:border-[#2a3b30] dark:bg-[#07110d] dark:text-[#f3f7f0]" accessibilityLabel="Search activity types" />
          <View style={styles.kindList}>
            {visibleActivities.map((item) => {
              const selected = kind === item.name
              return (
                <Pressable key={item.name} onPress={() => setKind(item.name)} className={`min-h-[44px] flex-row items-center justify-center gap-1.5 rounded-full border px-3 ${selected ? 'border-accent-200 bg-[#f0f7d0]' : 'border-[#e4e9df] bg-[#f0f3ec] dark:border-[#2a3b30] dark:bg-[#07110d]'}`} accessibilityRole="radio" accessibilityState={{ selected }}>
                  <Text className={`text-[10px] font-bold ${selected ? 'text-ink' : 'text-ink dark:text-[#dce8dd]'}`}>{item.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={16} color={ink} />}
                </Pressable>
              )
            })}
          </View>
          <Pressable onPress={() => onStart(kind)} className="mt-3 h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-accent-200 shadow-md">
            <Ionicons name={activityTracksRoute(kind) ? 'navigate' : 'time-outline'} size={18} color={ink} />
            <Text style={styles.startButtonText}>Start {kind.toLowerCase()}</Text>
          </Pressable>
          <Text className="mt-3 text-[10px] leading-[15px] text-slate-500 dark:text-[#9eafa2]">{activityTracksRoute(kind) ? 'Background location permission keeps your route recording while the screen is locked.' : 'This activity records time only and does not request location access.'} You can stop tracking at any time.</Text>
        </View>
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Activity history</Text>
        <Text style={styles.historyCount}>{store.history.length}</Text>
      </View>
      {store.history.length === 0 ? (
        <View className="rounded-[20px] border border-[#dfe7d9] bg-white p-4 dark:border-[#2a3b30] dark:bg-[#132018]"><Text className="text-[11px] text-slate-500 dark:text-[#9eafa2]">Your completed activities will show up here.</Text></View>
      ) : store.history.map((activity) => (
        <Pressable key={activity.id} onPress={() => setSelectedActivity(activity)} style={styles.historyCard} className="border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]" accessibilityRole="button" accessibilityLabel={`Open ${activity.kind} activity details`}>
          <View style={styles.historyIcon}><Ionicons name={activityTracksRoute(activity.kind) ? 'navigate-outline' : 'fitness-outline'} size={18} color={ink} /></View>
          <View style={styles.historyMain}>
            <Text style={styles.historyTitle} className="dark:text-[#f3f7f0]">{activity.kind}</Text>
            <Text style={styles.historyDate} className="dark:text-[#9eafa2]">{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString()}</Text>
            <Text style={styles.historyStats} className="dark:text-[#dce8dd]">{activityTracksRoute(activity.kind) ? `${formatActivityDistance(activity.distanceMeters)} mi · ` : ''}{formatActivityDuration(activity.elapsedSeconds)} · +{activity.earnedPoints ?? COMPLETION_POINTS} pts</Text>
          </View>
        </Pressable>
      ))}
      <Modal visible={!!selectedActivity} animationType="slide" onRequestClose={() => setSelectedActivity(null)}>
        <View style={styles.detailScreen}>
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setSelectedActivity(null)} style={styles.closeButton} accessibilityLabel="Close activity details"><Ionicons name="chevron-back" size={22} color={ink} /></Pressable>
            <Text style={styles.detailTitle}>Activity details</Text>
            <View style={styles.closeButton} />
          </View>
          {selectedActivity ? (
            <ScrollView contentContainerStyle={styles.detailContent}>
              <RouteExportCard activity={selectedActivity} captureTarget={routeExportRef} />
              <Pressable style={styles.saveRouteButton} onPress={async () => {
                if (!routeExportRef.current) return
                try {
                  const permission = await MediaLibrary.requestPermissionsAsync()
                  if (!permission.granted) {
                    Alert.alert('Photo access needed', 'Allow FitHive to save your route card to your photo gallery.')
                    return
                  }
                  const uri = await captureRef(routeExportRef.current, { format: 'png', quality: 1, result: 'tmpfile' })
                  await MediaLibrary.createAssetAsync(uri)
                  Alert.alert('Saved to Photos', 'Your FitHive route card is now in your photo gallery.')
                } catch (error) {
                  Alert.alert('Could not save route', error instanceof Error ? error.message : 'Please try again.')
                }
              }}>
                <Ionicons name="download-outline" size={19} color={ink} />
                <Text style={styles.saveRouteText}>Save transparent route card</Text>
              </Pressable>
              <Text style={styles.detailHint}>Your route card includes the path, FitHive branding, distance, time, and average pace.</Text>
            </ScrollView>
          ) : null}
          {bottomTabs}
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 19, paddingBottom: 32, backgroundColor: '#f4f7f1' },
  eyebrow: { color: muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: ink, fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  description: { color: muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 17 },
  rewardBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 11, backgroundColor: '#e9f6a9', borderRadius: 22, marginBottom: 16, borderWidth: 1, borderColor: '#d9e98b', shadowColor: '#17351e', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  rewardIcon: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#efffae', justifyContent: 'center', alignItems: 'center' },
  rewardCopy: { flex: 1 },
  rewardTitle: { color: ink, fontWeight: '800', fontSize: 14 },
  rewardSub: { color: '#4d5830', fontSize: 10, marginTop: 3 },
  activeCard: { backgroundColor: white, borderColor: '#dfe7d9', borderWidth: 1, borderRadius: 26, padding: 16, shadowColor: '#17351e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  activeTitle: { color: ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  recordingIndicator: { width: 12, height: 12, borderRadius: 8, backgroundColor: '#e9516c' },
  pausedIndicator: { backgroundColor: '#e2a72f' },
  metricsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5ebe0', paddingVertical: 14 },
  metric: { flex: 1 },
  metricLabel: { color: muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  metricValue: { color: ink, fontSize: 19, fontWeight: '800', marginTop: 5 },
  metricUnit: { color: muted, fontSize: 10, fontWeight: '600' },
  graphCard: { marginTop: 15 },
  graphTitle: { color: ink, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  controls: { flexDirection: 'row', gap: 9, marginTop: 15 },
  pauseButton: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: '#eceee7' },
  resumeButton: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: lime },
  controlText: { color: ink, fontSize: 12, fontWeight: '800' },
  finishButton: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: ink },
  finishText: { color: white, fontSize: 12, fontWeight: '800' },
  backgroundNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 12 },
  startCard: { backgroundColor: white, borderColor: '#dfe7d9', borderWidth: 1, borderRadius: 26, padding: 16, shadowColor: '#17351e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 },
  cardTitle: { color: ink, fontWeight: '800', fontSize: 17 },
  cardDescription: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  searchInput: { height: 46, borderRadius: 16, borderWidth: 1, borderColor: '#dfe7d9', paddingHorizontal: 12, marginTop: 13, color: ink, backgroundColor: '#fbfdf9' },
  kindList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  kindButton: { minHeight: 44, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, backgroundColor: '#f0f3ec', borderWidth: 1, borderColor: '#e4e9df' },
  kindSelected: { backgroundColor: '#f0f7d0', borderColor: '#cfe37d' },
  kindText: { color: ink, fontSize: 10, fontWeight: '700' },
  selectedKindText: { fontWeight: '800' },
  startButton: { height: 52, borderRadius: 26, backgroundColor: lime, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 13, shadowColor: '#718d14', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 3 },
  startButtonText: { color: ink, fontSize: 13, fontWeight: '800' },
  permissionNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 23, marginBottom: 10 },
  sectionTitle: { color: ink, fontSize: 18, fontWeight: '800' },
  historyCount: { color: muted, fontSize: 11, fontWeight: '700' },
  emptyHistory: { padding: 17, backgroundColor: white, borderColor: '#dfe7d9', borderWidth: 1, borderRadius: 20 },
  emptyHistoryText: { color: muted, fontSize: 11 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: white, borderColor: '#dfe7d9', borderWidth: 1, borderRadius: 20, marginBottom: 9, shadowColor: '#17351e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  historyIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: lime, alignItems: 'center', justifyContent: 'center' },
  historyMain: { flex: 1 },
  historyTitle: { color: ink, fontWeight: '800', fontSize: 12 },
  historyDate: { color: muted, fontSize: 9, marginTop: 3 },
  historyStats: { color: ink, fontSize: 10, fontWeight: '700', marginTop: 5 },
  detailScreen: { flex: 1, backgroundColor: '#f4f7f1' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 10 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9eee4' },
  detailTitle: { color: ink, fontSize: 16, fontWeight: '800' },
  detailContent: { alignItems: 'center', paddingHorizontal: 18, paddingBottom: 32 },
  exportCard: { backgroundColor: 'transparent', paddingTop: 16, paddingBottom: 13 },
  exportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  exportLogo: { color: ink, fontFamily: 'Pacifico_400Regular', fontSize: 27 },
  exportActivity: { color: muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  exportStats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: -4 },
  exportValue: { color: ink, fontSize: 16, fontWeight: '800' },
  exportLabel: { color: muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 3 },
  exportDate: { color: muted, fontSize: 10, marginTop: 13, paddingHorizontal: 12 },
  exportNoRoute: { color: muted, fontSize: 10, marginTop: 12, paddingHorizontal: 12 },
  saveRouteButton: { minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 26, backgroundColor: lime, marginTop: 18 },
  saveRouteText: { color: ink, fontSize: 13, fontWeight: '800' },
  detailHint: { color: muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
})
