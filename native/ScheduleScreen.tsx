import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ReactNode } from 'react'

export type ScheduleScreenProps = {
  styles: Record<string, any>
  scheduleWeek: Date[]
  selectedScheduleDate: Date
  setSelectedScheduleDate: (date: Date) => void
  moveScheduleWeek: (direction: number) => void
  scheduleTrips: Array<any>
  selectedDayTrips: Array<any>
  scheduleIds: string[]
  reserved: string[]
  importedWorkouts: Array<any>
  dailyFitnessMetrics: any
  activityStore: any
  ringMetricsForDate: (date: Date) => any
  tripDateKey: (trip: any) => string | null
  dateKey: (date: Date) => string
  setTab: (tab: any) => void
  openTrip: (trip: any) => void
  ScreenHeader: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  TripCard: (props: any) => ReactNode
  AppIcon: (props: any) => ReactNode
  FitnessRings: (props: any) => ReactNode
  darkMode?: boolean
}

export function ScheduleScreen({ styles, scheduleWeek, selectedScheduleDate, setSelectedScheduleDate, moveScheduleWeek, scheduleTrips, selectedDayTrips, scheduleIds, reserved, importedWorkouts, dailyFitnessMetrics, activityStore, ringMetricsForDate, tripDateKey, dateKey, setTab, openTrip, ScreenHeader, SectionTitle, TripCard, AppIcon, FitnessRings, darkMode = false }: ScheduleScreenProps) {
  const today = new Date()
  const background = darkMode ? '#080B09' : '#F5F6F2'
  const surface = darkMode ? '#171C19' : '#FFFFFF'
  const foreground = darkMode ? '#F8FAF7' : '#171C19'
  const muted = darkMode ? '#A9B3A9' : '#68736B'
  const border = darkMode ? '#2B332D' : '#E7EAE4'
  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ backgroundColor: background, paddingHorizontal: 18, paddingBottom: 28, paddingTop: 16 }}>
      <ScreenHeader title="Schedule" />
      <View style={{ marginBottom: 12, borderRadius: 23, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 12 }}>
        <View style={styles.weekCalendarHeader}><Pressable onPress={() => moveScheduleWeek(-1)} accessibilityLabel="Previous week" style={styles.weekArrow}><AppIcon name="chevron-back" size={17} /></Pressable><Text style={[styles.weekCalendarTitle, { color: foreground }]}>{scheduleWeek[0].toLocaleDateString([], { month: 'long' })} {scheduleWeek[0].getDate()} – {scheduleWeek[6].toLocaleDateString([], { month: 'long' })} {scheduleWeek[6].getDate()}</Text><Pressable onPress={() => moveScheduleWeek(1)} accessibilityLabel="Next week" style={styles.weekArrow}><AppIcon name="chevron-forward" size={17} /></Pressable></View>
        <View style={styles.weekDayRow}>{scheduleWeek.map((day) => { const selected = dateKey(day) === dateKey(selectedScheduleDate); const hasScheduledActivity = scheduleTrips.some((trip) => tripDateKey(trip) === dateKey(day)); return <Pressable key={dateKey(day)} onPress={() => setSelectedScheduleDate(day)} style={[styles.weekDay, selected && styles.weekDaySelected]} className="dark:bg-[#0d1a12]" accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={day.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}><Text style={[styles.weekDayName, selected && styles.weekDayTextSelected]} className="dark:text-[#9eafa2]">{day.toLocaleDateString([], { weekday: 'short' })}</Text><Text style={[styles.weekDayNumber, selected && styles.weekDayTextSelected]} className="dark:text-[#f3f7f0]">{day.getDate()}</Text>{hasScheduledActivity && <View style={[styles.weekEventDot, selected && styles.weekEventDotSelected]} />}</Pressable> })}</View>
      </View>
      <View style={{ marginBottom: 16, borderRadius: 23, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 12 }}><View style={styles.fitnessRingsHeader}><View><Text style={[styles.fitnessRingsTitle, { color: foreground }]}>{dateKey(selectedScheduleDate) === dateKey(today) ? "Today's movement" : `${selectedScheduleDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} movement`}</Text><Text style={[styles.fitnessRingsSub, { color: muted }]}>{dateKey(selectedScheduleDate) === dateKey(today) && dailyFitnessMetrics ? 'Synced today' : 'Completed activity estimate for this day'}</Text></View></View><FitnessRings values={ringMetricsForDate(selectedScheduleDate)} darkMode={darkMode} /><Text style={[styles.fitnessRingsNote, { color: muted }]}>Daily goals are estimates. Stand / move hours count hours with recorded movement, not a medical measure of standing.</Text></View>
      <View style={{ marginBottom: 16, borderRadius: 25, backgroundColor: darkMode ? '#222622' : '#171C19', padding: 20 }}><Text style={styles.highlightEyebrow}>UP NEXT</Text><Text style={styles.highlightTitle}>{scheduleTrips[0]?.title ?? 'Make a plan outdoors'}</Text><Text style={styles.highlightBody}>{scheduleTrips[0] ? `${scheduleTrips[0].shortDay}, ${scheduleTrips[0].shortDate} · ${scheduleTrips[0].time}` : 'Explore clubs and add an event to your schedule.'}</Text></View>
      <View style={{ marginBottom: 16, borderRadius: 23, borderWidth: 1, borderColor: darkMode ? '#6C4325' : '#FFD1B3', backgroundColor: darkMode ? '#2A1D14' : '#FFF4EB', padding: 12 }}><View style={styles.scheduleTrackerHeader}><View style={styles.scheduleTrackerIcon}><AppIcon name="fitness-outline" size={20} /></View><View style={styles.scheduleTrackerCopy}><Text style={[styles.scheduleTrackerTitle, { color: foreground }]}>Activity tracker</Text><Text style={[styles.scheduleTrackerSub, { color: muted }]}>Record a hike or run, or import workouts from your health app.</Text></View></View><Pressable style={[styles.scheduleTrackButton, { backgroundColor: surface }]} onPress={() => setTab('activity')}><Text style={[styles.scheduleTrackText, { color: foreground }]}>{activityStore.active ? 'Resume your activity' : 'Open activity tracker'}</Text><AppIcon name="arrow-forward" size={16} color={foreground} /></Pressable></View>
      {!!importedWorkouts.length && <><SectionTitle title="Synced workouts" />{importedWorkouts.slice(0, 3).map((workout) => <View key={workout.id} style={[styles.syncedWorkoutRow, { backgroundColor: surface, borderColor: border }]}><View style={styles.syncedWorkoutIcon}><AppIcon name="fitness" size={17} /></View><View style={styles.syncedWorkoutCopy}><Text style={[styles.syncedWorkoutTitle, { color: foreground }]} numberOfLines={1}>{workout.title}</Text><Text style={[styles.syncedWorkoutSub, { color: muted }]}>{workout.source} · {new Date(workout.startedAt).toLocaleDateString()}</Text></View><Text style={[styles.syncedWorkoutDistance, { color: foreground }]}>{workout.distanceMeters ? `${(workout.distanceMeters / 1609.344).toFixed(1)} mi` : `${Math.round(workout.durationSeconds / 60)} min`}</Text></View>)}</>}
      <SectionTitle title={selectedScheduleDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} action="Explore" onPress={() => setTab('explore')} />
      {selectedDayTrips.map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
      {!selectedDayTrips.length && <Text style={styles.emptyText}>No events on this day yet. Explore clubs to find your next activity.</Text>}
      <SectionTitle title="Discover events" />
      {scheduleTrips.filter((trip) => !scheduleIds.includes(trip.id)).slice(0, 4).map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
    </ScrollView>
  )
}
