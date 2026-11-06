import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { type ActivityKind, type ActivityStore, type RecordedActivity } from './activity'
import { activityCatalog, activityTracksRoute } from './activityCatalog'
import { RouteMap } from './RouteMap'
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
}: {
  store: ActivityStore
  elapsedSeconds: number
  onStart: (kind: ActivityKind) => void
  onPause: () => void
  onResume: () => void
  onFinish: () => void
}) {
  const [kind, setKind] = useState<ActivityKind>('Hiking')
  const [activitySearch, setActivitySearch] = useState('')
  const active = store.active
  const visibleActivities = useMemo(
    () => activityCatalog.filter((item) => item.name.toLowerCase().includes(activitySearch.trim().toLowerCase())),
    [activitySearch],
  )

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Activity tracker</Text>
      <Text style={styles.description}>Choose from outdoor, fitness, cardio, and sports activities. GPS maps are available for route-based activities.</Text>

      <View style={styles.rewardBanner}>
        <View style={styles.rewardIcon}><Ionicons name="trophy" size={21} color={ink} /></View>
        <View style={styles.rewardCopy}>
          <Text style={styles.rewardTitle}>{store.points} points earned</Text>
          <Text style={styles.rewardSub}>+{COMPLETION_POINTS} points for every completed activity</Text>
        </View>
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
        <View style={styles.startCard}>
          <Text style={styles.cardTitle}>Start an activity</Text>
          <Text style={styles.cardDescription}>Search the activity list, then start a timer. Route activities ask for location permission.</Text>
          <TextInput value={activitySearch} onChangeText={setActivitySearch} placeholder="Search activities" placeholderTextColor={muted} style={styles.searchInput} accessibilityLabel="Search activity types" />
          <View style={styles.kindList}>
            {visibleActivities.map((item) => {
              const selected = kind === item.name
              return (
                <Pressable key={item.name} onPress={() => setKind(item.name)} style={[styles.kindButton, selected && styles.kindSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
                  <Text style={[styles.kindText, selected && styles.selectedKindText]}>{item.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={16} color={ink} />}
                </Pressable>
              )
            })}
          </View>
          <Pressable onPress={() => onStart(kind)} style={styles.startButton}>
            <Ionicons name={activityTracksRoute(kind) ? 'navigate' : 'time-outline'} size={18} color={ink} />
            <Text style={styles.startButtonText}>Start {kind.toLowerCase()}</Text>
          </Pressable>
          <Text style={styles.permissionNote}>{activityTracksRoute(kind) ? 'Background location permission keeps your route recording while the screen is locked.' : 'This activity records time only and does not request location access.'} You can stop tracking at any time.</Text>
        </View>
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Activity history</Text>
        <Text style={styles.historyCount}>{store.history.length}</Text>
      </View>
      {store.history.length === 0 ? (
        <View style={styles.emptyHistory}><Text style={styles.emptyHistoryText}>Your completed activities will show up here.</Text></View>
      ) : store.history.map((activity) => (
        <View key={activity.id} style={styles.historyCard}>
          <View style={styles.historyIcon}><Ionicons name={activityTracksRoute(activity.kind) ? 'navigate-outline' : 'fitness-outline'} size={18} color={ink} /></View>
          <View style={styles.historyMain}>
            <Text style={styles.historyTitle}>{activity.kind}</Text>
            <Text style={styles.historyDate}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString()}</Text>
            <Text style={styles.historyStats}>{activityTracksRoute(activity.kind) ? `${formatActivityDistance(activity.distanceMeters)} mi · ` : ''}{formatActivityDuration(activity.elapsedSeconds)} · +{activity.earnedPoints ?? COMPLETION_POINTS} pts</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 19, paddingBottom: 32 },
  eyebrow: { color: muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: ink, fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  description: { color: muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 17 },
  rewardBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 11, backgroundColor: lime, borderRadius: 17, marginBottom: 16 },
  rewardIcon: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#efffae', justifyContent: 'center', alignItems: 'center' },
  rewardCopy: { flex: 1 },
  rewardTitle: { color: ink, fontWeight: '800', fontSize: 14 },
  rewardSub: { color: '#4d5830', fontSize: 10, marginTop: 3 },
  activeCard: { backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 21, padding: 15 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  activeTitle: { color: ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  recordingIndicator: { width: 12, height: 12, borderRadius: 8, backgroundColor: '#e9516c' },
  pausedIndicator: { backgroundColor: '#e2a72f' },
  metricsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: line, paddingVertical: 13 },
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
  startCard: { backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 21, padding: 16 },
  cardTitle: { color: ink, fontWeight: '800', fontSize: 17 },
  cardDescription: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  searchInput: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: line, paddingHorizontal: 12, marginTop: 13, color: ink },
  kindList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  kindButton: { minHeight: 36, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 18, backgroundColor: '#f0f1eb', borderWidth: 1, borderColor: '#f0f1eb' },
  kindSelected: { backgroundColor: '#f5ffd5', borderColor: lime },
  kindText: { color: ink, fontSize: 10, fontWeight: '700' },
  selectedKindText: { fontWeight: '800' },
  startButton: { height: 49, borderRadius: 25, backgroundColor: lime, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  startButtonText: { color: ink, fontSize: 13, fontWeight: '800' },
  permissionNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 23, marginBottom: 10 },
  sectionTitle: { color: ink, fontSize: 18, fontWeight: '800' },
  historyCount: { color: muted, fontSize: 11, fontWeight: '700' },
  emptyHistory: { padding: 17, backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 16 },
  emptyHistoryText: { color: muted, fontSize: 11 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: white, borderColor: line, borderWidth: 1, borderRadius: 16, marginBottom: 9 },
  historyIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: lime, alignItems: 'center', justifyContent: 'center' },
  historyMain: { flex: 1 },
  historyTitle: { color: ink, fontWeight: '800', fontSize: 12 },
  historyDate: { color: muted, fontSize: 9, marginTop: 3 },
  historyStats: { color: ink, fontSize: 10, fontWeight: '700', marginTop: 5 },
})
