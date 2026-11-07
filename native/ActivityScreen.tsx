import { Ionicons } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library'
import { useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { useColorScheme } from 'nativewind'
import Svg, { Circle, Polyline } from 'react-native-svg'
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { type ActivityKind, type ActivityStore, type RecordedActivity } from './activity'
import { activityCatalog, activityTracksRoute, sportAssetRegistry } from './activityCatalog'
import { theme } from '../src/theme'
import { RouteMap } from './RouteMap'
import { FitnessRings, type FitnessRingValues } from './FitnessRings'
import { ActivityTrendChart } from './ActivityTrendChart'
import {
  calculatePaceSecondsPerMile,
  COMPLETION_POINTS,
  formatActivityDistance,
  formatActivityDuration,
  formatPace,
} from './activityMetrics'

const ink = theme.colors.ink
const muted = theme.colors.muted
const accent = theme.colors.accent
const line = theme.colors.line
const white = '#FFFFFF'
const featuredSportKinds: ActivityKind[] = ['Mountain Biking', 'Snowboarding', 'Skiing', 'Surfing', 'Rock Climbing', 'Kayaking']

function sportVisual(kind: string) {
  const normalized = kind.toLowerCase()
  const image = sportAssetRegistry[kind as keyof typeof sportAssetRegistry]
  if (normalized.includes('bike') || normalized.includes('cycl')) {
    return { icon: 'bicycle-outline' as const, label: 'Ride', tint: '#FF7900', image }
  }
  if (normalized.includes('snowboard')) {
    return { icon: 'snow-outline' as const, label: 'Snowboard', tint: '#8ABFE7', image }
  }
  if (normalized.includes('ski') || normalized.includes('snowshoe')) {
    return { icon: 'snow-outline' as const, label: 'Snow', tint: '#9CC7E8', image }
  }
  if (normalized.includes('surf') || normalized.includes('kayak') || normalized.includes('paddle') || normalized.includes('swim')) {
    return { icon: 'water-outline' as const, label: 'Water', tint: '#6FB7C9', image }
  }
  if (normalized.includes('climb') || normalized.includes('boulder')) {
    return { icon: 'fitness-outline' as const, label: 'Climb', tint: '#D8A56A' }
  }
  if (normalized.includes('skate') || normalized.includes('hockey')) {
    return { icon: 'snow-outline' as const, label: 'Glide', tint: '#B8D6E8' }
  }
  if (normalized.includes('martial') || normalized.includes('boxing') || normalized.includes('kickboxing') || normalized.includes('jiu-jitsu') || normalized.includes('capoeira')) {
    return { icon: 'flash-outline' as const, label: 'Combat', tint: '#E98A72' }
  }
  if (normalized.includes('parkour') || normalized.includes('calisthenics')) {
    return { icon: 'body-outline' as const, label: 'Flow', tint: '#B68AE8' }
  }
  if (normalized.includes('tennis') || normalized.includes('pickleball') || normalized.includes('badminton') || normalized.includes('racquet')) {
    return { icon: 'tennisball-outline' as const, label: 'Racquet', tint: '#A7C957' }
  }
  if (normalized.includes('basketball') || normalized.includes('soccer') || normalized.includes('volleyball') || normalized.includes('lacrosse') || normalized.includes('rugby') || normalized.includes('cricket') || normalized.includes('frisbee') || normalized.includes('golf')) {
    return { icon: 'football-outline' as const, label: 'Field', tint: '#79B77A' }
  }
  if (normalized.includes('run') || normalized.includes('walk')) {
    return { icon: 'walk-outline' as const, label: 'Move', tint: '#FFB067' }
  }
  return { icon: 'navigate-outline' as const, label: 'Explore', tint: '#75B9A2' }
}

function SportVisual({ kind, dark, compact = false }: { kind: string; dark: boolean; compact?: boolean }) {
  const visual = sportVisual(kind)
  return (
    <View
      style={[styles.sportVisual, compact && styles.sportVisualCompact, { borderColor: dark ? theme.colors.darkBorder : theme.colors.line }]}
    >
      <View style={[styles.absoluteFill, { backgroundColor: dark ? '#111812' : '#EAF0EA' }]} />
      {visual.image ? <Image source={visual.image} resizeMode="contain" style={[styles.absoluteFill, styles.sportVisualImage]} /> : null}
      <View style={[styles.absoluteFill, styles.sportVisualShade, { backgroundColor: visual.image ? 'rgba(4,8,6,0.32)' : `${visual.tint}22` }]} />
      <View style={styles.sportVisualContent}>
        <View style={[styles.sportVisualIcon, { backgroundColor: `${visual.tint}DD` }]}>
          <Ionicons name={visual.icon} size={compact ? 18 : 24} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.sportVisualEyebrow}>FEATURED DISCIPLINE</Text>
          <Text style={styles.sportVisualTitle}>{kind}</Text>
          <Text style={styles.sportVisualSubtitle}>{visual.label} beyond ordinary.</Text>
        </View>
      </View>
    </View>
  )
}
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

function RouteExportCard({ activity, captureTarget, dark }: { activity: RecordedActivity; captureTarget: Ref<any>; dark: boolean }) {
  const { width } = useWindowDimensions()
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const secondary = dark ? theme.colors.darkMuted : theme.colors.muted
  const cardWidth = Math.min(width - 36, 360)
  const routeHeight = 230
  const hasRecordedRoute = activity.points.length > 1
  const polyline = hasRecordedRoute ? routePolyline(activity.points, cardWidth, routeHeight) : ''
  return (
    <View ref={captureTarget} collapsable={false} style={[styles.exportCard, { width: cardWidth, backgroundColor: dark ? '#171C19' : '#FFFFFF' }]}> 
      <View style={styles.exportHeader}>
        <Text style={[styles.exportLogo, { color: foreground }]}>FitHive</Text>
        <Text style={[styles.exportActivity, { color: secondary }]}>{activity.kind.toUpperCase()}</Text>
      </View>
      <Svg width={cardWidth} height={routeHeight} viewBox={`0 0 ${cardWidth} ${routeHeight}`}>
        {polyline ? <><Circle cx={12} cy={routeHeight - 14} r={5} fill="#FF7900" /><Polyline points={polyline} fill="none" stroke="#FF7900" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={cardWidth - 12} cy={14} r={5} fill="#FFB067" /></> : null}
      </Svg>
      {!hasRecordedRoute ? <Text style={[styles.exportNoRoute, { color: secondary }]}>No route recorded</Text> : null}
      <View style={styles.exportStats}>
        <View><Text style={[styles.exportValue, { color: foreground }]}>{formatActivityDistance(activity.distanceMeters)} mi</Text><Text style={[styles.exportLabel, { color: secondary }]}>DISTANCE</Text></View>
        <View><Text style={[styles.exportValue, { color: foreground }]}>{formatActivityDuration(activity.elapsedSeconds)}</Text><Text style={[styles.exportLabel, { color: secondary }]}>TIME</Text></View>
        <View><Text style={[styles.exportValue, { color: foreground }]}>{formatPace(calculatePaceSecondsPerMile(activity.distanceMeters, activity.elapsedSeconds))}</Text><Text style={[styles.exportLabel, { color: secondary }]}>AVG PACE</Text></View>
      </View>
      <Text style={[styles.exportDate, { color: secondary }]}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
    </View>
  )
}

function RouteThumbnail({ activity, dark }: { activity: RecordedActivity; dark: boolean }) {
  const hasRecordedRoute = activity.points.length > 1
  const polyline = hasRecordedRoute ? routePolyline(activity.points, 72, 52) : ''
  return (
    <View style={[styles.routeThumbnail, { backgroundColor: dark ? '#222622' : '#F5F6F2' }]} accessibilityLabel="Activity route preview">
      {hasRecordedRoute ? <Svg width={72} height={52} viewBox="0 0 72 52"><Circle cx={5} cy={47} r={3} fill="#FF7900" /><Polyline points={polyline} fill="none" stroke="#FF7900" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={67} cy={5} r={3} fill="#FFB067" /></Svg> : <Text style={styles.noRouteText}>No route</Text>}
    </View>
  )
}

function Metric({ label, value, unit, darkMode }: { label: string; value: string; unit?: string; darkMode?: boolean }) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const secondary = dark ? theme.colors.darkMuted : theme.colors.muted
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: secondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: foreground }]}>{value}{unit ? <Text style={[styles.metricUnit, { color: secondary }]}> {unit}</Text> : null}</Text>
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
  darkMode,
  bottomTabs,
}: {
  store: ActivityStore
  elapsedSeconds: number
  onStart: (kind: ActivityKind) => void | Promise<boolean>
  onPause: () => void
  onResume: () => void
  onFinish: () => void
  ringMetrics: FitnessRingValues
  darkMode?: boolean
  bottomTabs?: ReactNode
}) {
  const [kind, setKind] = useState<ActivityKind>('Hiking')
  const [activitySearch, setActivitySearch] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<RecordedActivity | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const routeExportRef = useRef<any>(null)
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const background = dark ? theme.colors.dark : theme.colors.paper
  const surface = dark ? theme.colors.darkSurface : '#FFFFFF'
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const secondary = dark ? theme.colors.darkMuted : theme.colors.muted
  const borderColor = dark ? theme.colors.darkBorder : theme.colors.line
  const active = store.active
  const trendData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - (6 - index))
      const minutes = store.history
        .filter((activity) => {
          const activityDate = new Date(activity.endedAt ?? activity.startedAt)
          return activityDate.getFullYear() === date.getFullYear()
            && activityDate.getMonth() === date.getMonth()
            && activityDate.getDate() === date.getDate()
        })
        .reduce((total, activity) => total + Math.max(0, Math.round(activity.elapsedSeconds / 60)), 0)
      return { label: date.toLocaleDateString([], { weekday: 'short' }), minutes }
    })
  }, [store.history])
  const visibleActivities = useMemo(
    () => activityCatalog
      .filter((item) => item.name.toLowerCase().includes(activitySearch.trim().toLowerCase()))
      .slice(0, 6),
    [activitySearch],
  )

  const startSelectedActivity = async () => {
    const started = await onStart(kind)
    if (started !== false) setPickerVisible(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
    <ScrollView style={{ backgroundColor: background }} className="flex-1" contentContainerStyle={{ backgroundColor: background }} contentContainerClassName="px-[18px] pb-32 pt-5">
      <View style={styles.trackHeader}>
        <View><Text style={[styles.eyebrow, { color: accent }]}>FITHIVE TRACK</Text><Text style={[styles.title, { color: foreground }]}>Today’s movement</Text><Text style={[styles.description, { color: secondary }]}>Every move counts. Make yours matter.</Text></View>
        <Pressable style={[styles.headerAction, { backgroundColor: surface, borderColor }]} accessibilityLabel="Activity tracking information"><Ionicons name="information-outline" size={19} color={foreground} /></Pressable>
      </View>

      <View style={[styles.rewardBanner, { backgroundColor: dark ? '#2A1D14' : '#FFF4EB', borderColor: dark ? '#6C4325' : '#FFD1B3' }]}>
        <View style={[styles.rewardIcon, { backgroundColor: '#FF7900' }]}><Ionicons name="trophy" size={21} color="#FFFFFF" /></View>
        <View className="flex-1">
          <Text style={[styles.rewardTitle, { color: foreground }]}>{store.points} points earned</Text>
          <Text style={[styles.rewardSub, { color: secondary }]}>+{COMPLETION_POINTS} points for every completed activity</Text>
        </View>
      </View>

      <View style={[styles.dashboardCard, { backgroundColor: surface, borderColor }]}> 
        <View style={styles.dashboardHeader}><View><Text style={[styles.cardTitle, { color: foreground }]}>Today’s activity</Text><Text style={[styles.cardDescription, { color: secondary }]}>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</Text></View><View style={[styles.todayPill, { backgroundColor: dark ? '#2B332D' : '#F5F6F2' }]}><View style={styles.liveDot} /><Text style={[styles.todayPillText, { color: secondary }]}>LIVE</Text></View></View>
        <SportVisual kind={active?.kind ?? 'Mountain Biking'} dark={dark} />
        <View style={styles.dashboardBody}>
          <FitnessRings values={ringMetrics} compact variant="dashboard" darkMode={dark} />
          <View style={styles.dashboardMetrics}>
            <Metric label="MOVE" value={String(Math.round(ringMetrics.move))} unit="kcal" darkMode={dark} />
            <Metric label="EXERCISE" value={String(Math.round(ringMetrics.exercise))} unit="min" darkMode={dark} />
            <Metric label="STAND" value={String(Math.round(ringMetrics.stand))} unit="hrs" darkMode={dark} />
          </View>
        </View>
      </View>

      {!active && <ActivityTrendChart data={store.history.length ? trendData : []} dark={dark} />}

      {active ? (
        <View style={[styles.activeCard, { backgroundColor: surface, borderColor }]}>
          <View style={styles.activeTop}>
            <View>
              <Text style={[styles.eyebrow, { color: secondary }]}>{active.status === 'recording' ? 'RECORDING' : 'PAUSED'}</Text>
              <Text style={[styles.activeTitle, { color: foreground }]}>{active.kind}</Text>
            </View>
            <View style={[styles.recordingIndicator, active.status === 'paused' && styles.pausedIndicator]} />
          </View>
          <View style={[styles.metricsRow, { borderColor }]}>
            {activityTracksRoute(active.kind) && <Metric label="DISTANCE" value={formatActivityDistance(active.distanceMeters)} unit="mi" darkMode={dark} />}
            <Metric label="DURATION" value={formatActivityDuration(elapsedSeconds)} darkMode={dark} />
            {activityTracksRoute(active.kind) && <Metric label="AVG PACE" value={formatPace(calculatePaceSecondsPerMile(active.distanceMeters, elapsedSeconds))} unit="/mi" darkMode={dark} />}
          </View>
          {activityTracksRoute(active.kind) && <View style={styles.graphCard}><Text style={[styles.graphTitle, { color: foreground }]}>Your route</Text><RouteMap points={active.points} darkMode={dark} /></View>}
          <View style={styles.controls}>
            {active.status === 'recording' ? (
              <Pressable onPress={onPause} style={[styles.pauseButton, { backgroundColor: dark ? '#2B332D' : '#E7EAE4' }]} accessibilityLabel="Pause activity">
                <Ionicons name="pause" size={18} color={foreground} />
                <Text style={[styles.controlText, { color: foreground }]}>Pause</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onResume} style={styles.resumeButton} accessibilityLabel="Resume activity">
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={[styles.controlText, { color: '#FFFFFF' }]}>Resume</Text>
              </Pressable>
            )}
            <Pressable onPress={onFinish} style={styles.finishButton} accessibilityLabel="Finish activity">
              <Ionicons name="stop" size={18} color={white} />
              <Text style={styles.finishText}>Finish activity</Text>
            </Pressable>
          </View>
          <Text style={[styles.backgroundNote, { color: secondary }]}>{activityTracksRoute(active.kind) ? 'GPS stays on in the background while recording. A system location indicator remains visible.' : 'This activity records your elapsed time without collecting location.'}</Text>
        </View>
      ) : null}

      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, { color: foreground }]}>Activity history</Text>
        <Text style={[styles.historyCount, { color: secondary }]}>{store.history.length}</Text>
      </View>
      {store.history.length === 0 ? (
        <View style={[styles.emptyHistory, { backgroundColor: surface, borderColor }]}><Text style={[styles.emptyHistoryText, { color: secondary }]}>Your completed activities will show up here.</Text></View>
      ) : store.history.map((activity) => (
        <Pressable key={activity.id} onPress={() => setSelectedActivity(activity)} style={[styles.historyCard, { backgroundColor: surface, borderColor }]} accessibilityRole="button" accessibilityLabel={`Open ${activity.kind} activity details`}>
          <View style={styles.historyIcon}><Ionicons name={activityTracksRoute(activity.kind) ? 'navigate-outline' : 'fitness-outline'} size={18} color="#FFFFFF" /></View>
          <View style={styles.historyMain}>
            <Text style={[styles.historyTitle, { color: foreground }]}>{activity.kind}</Text>
            <Text style={[styles.historyDate, { color: secondary }]}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString()}</Text>
            <Text style={[styles.historyStats, { color: foreground }]}>{activityTracksRoute(activity.kind) ? `${formatActivityDistance(activity.distanceMeters)} mi · ` : ''}{formatActivityDuration(activity.elapsedSeconds)} · +{activity.earnedPoints ?? COMPLETION_POINTS} pts</Text>
          </View>
          <RouteThumbnail activity={activity} dark={dark} />
        </Pressable>
      ))}
      {!active && <Pressable onPress={() => setPickerVisible(true)} style={styles.floatingStartButton} accessibilityRole="button" accessibilityLabel="Start an activity">
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>}

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={[styles.pickerSheet, { backgroundColor: surface, borderColor }]}>
            <View style={styles.pickerHeader}>
              <View><Text style={[styles.cardTitle, { color: foreground }]}>Start an activity</Text><Text style={[styles.cardDescription, { color: secondary }]}>Choose how you want to move today.</Text></View>
              <Pressable onPress={() => setPickerVisible(false)} style={[styles.pickerClose, { backgroundColor: dark ? '#222622' : '#E7EAE4' }]} accessibilityLabel="Close activity picker"><Ionicons name="close" size={22} color={foreground} /></Pressable>
            </View>
            <TextInput value={activitySearch} onChangeText={setActivitySearch} placeholder="Search activities" placeholderTextColor={secondary} style={[styles.searchInput, { color: foreground, backgroundColor: dark ? '#0F1511' : '#FBFDF9', borderColor }]} accessibilityLabel="Search activity types" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredSports} keyboardShouldPersistTaps="handled">
              {featuredSportKinds.map((featuredKind) => {
                const selected = kind === featuredKind
                const visual = sportVisual(featuredKind)
                return <Pressable key={featuredKind} onPress={() => setKind(featuredKind)} style={[styles.featuredSport, { backgroundColor: selected ? accent : (dark ? '#222622' : '#F5F6F2'), borderColor: selected ? accent : borderColor }]} accessibilityRole="button" accessibilityLabel={`Choose ${featuredKind}`}>
                  <Ionicons name={visual.icon} size={16} color={selected ? '#FFFFFF' : visual.tint} />
                  <Text style={[styles.featuredSportText, { color: selected ? '#FFFFFF' : foreground }]}>{featuredKind}</Text>
                </Pressable>
              })}
            </ScrollView>
            <View style={styles.kindList}>
              {visibleActivities.map((item) => {
                const selected = kind === item.name
                return <Pressable key={item.name} onPress={() => setKind(item.name)} style={[styles.kindButton, { backgroundColor: selected ? '#FF7900' : (dark ? '#0F1511' : '#F5F6F2'), borderColor: selected ? '#FF7900' : borderColor }]} accessibilityRole="radio" accessibilityState={{ selected }}><Text style={[styles.kindText, { color: selected ? '#FFFFFF' : foreground }]}>{item.name}</Text>{selected && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}</Pressable>
              })}
            </View>
            <Pressable onPress={() => void startSelectedActivity()} style={styles.startButton} accessibilityLabel={`Start ${kind.toLowerCase()} activity`}><Ionicons name={activityTracksRoute(kind) ? 'navigate' : 'time-outline'} size={18} color="#FFFFFF" /><Text style={styles.startButtonText}>Start {kind.toLowerCase()}</Text></Pressable>
            <Text style={[styles.permissionNote, { color: secondary }]}>{activityTracksRoute(kind) ? 'Background location permission keeps your route recording while the screen is locked.' : 'This activity records time only and does not request location access.'}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedActivity} animationType="slide" onRequestClose={() => setSelectedActivity(null)}>
        <View style={[styles.detailScreen, { backgroundColor: background }]}>
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setSelectedActivity(null)} style={[styles.closeButton, { backgroundColor: dark ? '#202823' : '#E7EAE4' }]} accessibilityLabel="Close activity details"><Ionicons name="chevron-back" size={22} color={foreground} /></Pressable>
            <Text style={[styles.detailTitle, { color: foreground }]}>Activity details</Text>
            <View style={styles.closeButton} />
          </View>
          {selectedActivity ? (
            <ScrollView contentContainerStyle={styles.detailContent}>
              <RouteExportCard activity={selectedActivity} captureTarget={routeExportRef} dark={dark} />
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
                <Ionicons name="download-outline" size={19} color="#FFFFFF" />
                <Text style={styles.saveRouteText}>Save route card</Text>
              </Pressable>
              <Text style={[styles.detailHint, { color: secondary }]}>Your route card includes the path, FitHive branding, distance, time, and average pace.</Text>
            </ScrollView>
          ) : null}
          {bottomTabs}
        </View>
      </Modal>
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  content: { paddingHorizontal: 18, paddingTop: 19, paddingBottom: 32, backgroundColor: '#F5F6F2' },
  trackHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  headerAction: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  eyebrow: { color: muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: ink, fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  description: { color: muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 17 },
  rewardBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 11, backgroundColor: '#FFF4EB', borderRadius: 22, marginBottom: 16, borderWidth: 1, borderColor: '#FFD1B3', shadowColor: '#171C19', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  rewardIcon: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#FF7900', justifyContent: 'center', alignItems: 'center' },
  rewardCopy: { flex: 1 },
  rewardTitle: { color: ink, fontWeight: '800', fontSize: 14 },
  rewardSub: { color: muted, fontSize: 10, marginTop: 3 },
  activeCard: { backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 26, padding: 16, shadowColor: '#171C19', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  activeTitle: { color: ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  recordingIndicator: { width: 12, height: 12, borderRadius: 8, backgroundColor: '#e9516c' },
  pausedIndicator: { backgroundColor: '#e2a72f' },
  metricsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: line, paddingVertical: 14 },
  metric: { flex: 1 },
  metricLabel: { color: muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  metricValue: { color: ink, fontSize: 19, fontWeight: '800', marginTop: 5 },
  metricUnit: { color: muted, fontSize: 10, fontWeight: '600' },
  graphCard: { marginTop: 15 },
  graphTitle: { color: ink, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  controls: { flexDirection: 'row', gap: 9, marginTop: 15 },
  pauseButton: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: '#E7EAE4' },
  resumeButton: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: accent },
  controlText: { color: ink, fontSize: 12, fontWeight: '800' },
  finishButton: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: ink },
  finishText: { color: white, fontSize: 12, fontWeight: '800' },
  backgroundNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 12 },
  startCard: { backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 26, padding: 16, shadowColor: '#171C19', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 },
  cardTitle: { color: ink, fontWeight: '800', fontSize: 17 },
  cardDescription: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  searchInput: { height: 46, borderRadius: 16, borderWidth: 1, borderColor: line, paddingHorizontal: 12, marginTop: 13, color: ink, backgroundColor: '#FBFDF9' },
  featuredSports: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  featuredSport: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  featuredSportText: { fontSize: 10, fontWeight: '800' },
  kindList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  kindButton: { minHeight: 44, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, backgroundColor: '#F5F6F2', borderWidth: 1, borderColor: line },
  kindSelected: { backgroundColor: '#FF7900', borderColor: '#FF7900' },
  kindText: { color: ink, fontSize: 10, fontWeight: '700' },
  selectedKindText: { fontWeight: '800' },
  dashboardCard: { backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 26, padding: 16, shadowColor: '#171C19', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 },
  dashboardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sportVisual: { height: 142, borderRadius: 21, overflow: 'hidden', borderWidth: 1, marginTop: 14 },
  sportVisualCompact: { height: 88, marginTop: 10 },
  sportVisualImage: { opacity: 0.9 },
  sportVisualShade: { opacity: 1 },
  sportVisualContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 14 },
  sportVisualIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sportVisualEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  sportVisualTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 2 },
  sportVisualSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 10, marginTop: 2 },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: accent },
  todayPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  dashboardBody: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dashboardMetrics: { flex: 1, gap: 13, paddingLeft: 4 },
  floatingStartButton: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7900', shadowColor: '#FF7900', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.58)' },
  pickerSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pickerClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B332D' },
  startButton: { height: 52, borderRadius: 26, backgroundColor: accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 13, shadowColor: '#FF7900', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 3 },
  startButtonText: { color: white, fontSize: 13, fontWeight: '800' },
  permissionNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 23, marginBottom: 10 },
  sectionTitle: { color: ink, fontSize: 18, fontWeight: '800' },
  historyCount: { color: muted, fontSize: 11, fontWeight: '700' },
  emptyHistory: { padding: 17, backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 20 },
  emptyHistoryText: { color: muted, fontSize: 11 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 20, marginBottom: 9, shadowColor: '#171C19', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  historyIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' },
  historyMain: { flex: 1 },
  historyTitle: { color: ink, fontWeight: '800', fontSize: 12 },
  historyDate: { color: muted, fontSize: 9, marginTop: 3 },
  historyStats: { color: ink, fontSize: 10, fontWeight: '700', marginTop: 5 },
  routeThumbnail: { width: 78, height: 58, borderRadius: 14, backgroundColor: '#F5F6F2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  noRouteText: { color: muted, fontSize: 9, fontWeight: '700' },
  detailScreen: { flex: 1, backgroundColor: '#F5F6F2' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 10 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EAE4' },
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
  saveRouteButton: { minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 26, backgroundColor: accent, marginTop: 18 },
  saveRouteText: { color: white, fontSize: 13, fontWeight: '800' },
  detailHint: { color: muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
})
