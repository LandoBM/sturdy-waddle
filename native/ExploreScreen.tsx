import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useState, type ReactNode } from 'react'
import { theme } from '../src/theme'
import { ExploreSearchResults } from './ExploreSearchResults'
import type { SharedBottomSheetPresenter } from './bottomSheetMigration'

export type ExploreScreenProps = {
  styles: Record<string, any>
  colors: { white: string }
  trips: Array<any>
  moments: Array<any>
  locationLabel: string
  onLocationChange?: (location: string) => void
  registered: string[]
  saved: string[]
  momentsCount: number
  setTab: (tab: any) => void
  openTrip: (trip: any) => void
  openClub: (clubId: string) => void
  openProfile: (profileId: string) => void
  openMoment?: (moment: any) => void
  toggleSaved?: (tripId: string) => void
  openCollection?: (kind: 'events' | 'saved' | 'moments') => void
  ScreenHeader: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  TripCard: (props: any) => ReactNode
  AppIcon: (props: any) => ReactNode
  darkMode?: boolean
  presentBottomSheet?: SharedBottomSheetPresenter
  dismissBottomSheet?: () => void
}

const stateNames: Record<string, string> = { California: 'CA', Alaska: 'AK', Utah: 'UT', Georgia: 'GA', 'New York': 'NY', Texas: 'TX', Washington: 'WA', Colorado: 'CO', Illinois: 'IL' }
const cityStates: Record<string, string> = { 'Los Angeles': 'CA', 'Joshua Tree': 'CA', 'Denali': 'AK', 'Zion': 'UT', Austin: 'TX', Seattle: 'WA', Denver: 'CO', Chicago: 'IL', 'New York': 'NY', Atlanta: 'GA' }

function eventState(location = '') {
  const stateCode = location.match(/\b[A-Z]{2}\b/)?.[0]
  if (stateCode) return stateCode
  const stateName = Object.keys(stateNames).find((name) => location.toLowerCase().includes(name.toLowerCase()))
  if (stateName) return stateNames[stateName]
  const city = Object.keys(cityStates).find((name) => location.toLowerCase().includes(name.toLowerCase()))
  return city ? cityStates[city] : ''
}

function eventCity(location = '') {
  return Object.keys(cityStates).find((city) => location.toLowerCase().includes(city.toLowerCase())) ?? location.split(',')[0]?.trim() ?? ''
}

function ActivityCard({ trip, saved, onPress, onToggleSaved, foreground, muted, surface, border, AppIcon }: { trip: any; saved: boolean; onPress: () => void; onToggleSaved?: () => void; foreground: string; muted: string; surface: string; border: string; AppIcon: (props: any) => ReactNode }) {
  const [imageFailed, setImageFailed] = useState(false)
  const remaining = Number(trip.slots)
  const capacity = Number(trip.capacity)
  const hasParticipants = Number.isFinite(remaining) && Number.isFinite(capacity) && capacity > 0
  const participantLabel = hasParticipants ? `${Math.max(0, capacity - remaining)}/${capacity} joined` : null

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [exploreStyles.activityCard, { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.9 : 1 }]} accessibilityRole="button" accessibilityLabel={`Open ${trip.title}`}>
      <View style={exploreStyles.activityImageWrap}>
        {(trip.imageSource || trip.image) && !imageFailed ? <Image source={trip.imageSource ?? { uri: trip.image }} style={exploreStyles.activityImage} resizeMode="cover" onError={() => { setImageFailed(true); if (__DEV__) console.warn('[Explore image failed]', trip.id, trip.image) }} /> : <View style={[exploreStyles.activityImage, { backgroundColor: '#303238', alignItems: 'center', justifyContent: 'center' }]}><AppIcon name="images-outline" size={30} color="#A1A1AA" /></View>}
        <View style={exploreStyles.activityImageShade} />
        <Text style={exploreStyles.activityCategory}>{String(trip.category ?? 'Activity').toUpperCase()}</Text>
        {onToggleSaved && <Pressable onPress={(event) => { event.stopPropagation(); onToggleSaved() }} style={exploreStyles.saveButton} accessibilityRole="button" accessibilityLabel={saved ? `Remove ${trip.title} from saved` : `Save ${trip.title}`}><AppIcon name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#FF7900' : '#FFFFFF'} /></Pressable>}
      </View>
      <View style={exploreStyles.activityBody}>
        <Text style={[exploreStyles.activityTitle, { color: foreground }]} numberOfLines={2}>{trip.title}</Text>
        <Text style={[exploreStyles.activityMeta, { color: muted }]} numberOfLines={1}>{trip.shortDay} · {trip.shortDate} · {trip.time}</Text>
        <Text style={[exploreStyles.activityMeta, { color: muted }]} numberOfLines={1}>{eventCity(trip.location)}{eventState(trip.location) ? `, ${eventState(trip.location)}` : ''}</Text>
        <Text style={[exploreStyles.activityOrganizer, { color: foreground }]} numberOfLines={1}>Hosted by {trip.club}</Text>
        <View style={exploreStyles.activityFooter}>
          {participantLabel ? <Text style={[exploreStyles.activityMeta, { color: muted }]} numberOfLines={1}>{participantLabel}</Text> : <View />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>{trip.demo && <View style={exploreStyles.demoPill}><Text style={exploreStyles.demoText}>DEMO</Text></View>}{saved && <View style={exploreStyles.registeredPill}><Text style={exploreStyles.registeredText}>SAVED</Text></View>}</View>
        </View>
      </View>
    </Pressable>
  )
}

export function ExploreScreen({ styles, colors, trips, moments, locationLabel, onLocationChange, registered, saved, momentsCount, setTab, openTrip, openClub, openProfile, openMoment, toggleSaved, openCollection, ScreenHeader, SectionTitle, TripCard, AppIcon, darkMode = false }: ExploreScreenProps) {
  const [query, setQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [locationPickerVisible, setLocationPickerVisible] = useState(false)
  const [expandLocationSearch, setExpandLocationSearch] = useState(false)
  const background = darkMode ? theme.colors.dark : theme.colors.paper
  const surface = darkMode ? theme.colors.darkSurface : '#FFFFFF'
  const foreground = darkMode ? theme.colors.darkText : theme.colors.ink
  const muted = darkMode ? theme.colors.darkMuted : theme.colors.muted
  const border = darkMode ? theme.colors.darkBorder : theme.colors.line
  const elevated = darkMode ? theme.colors.darkElevated : '#FFFFFF'
  const categories = ['All', 'Running', 'Hiking', 'Cycling', 'Yoga', 'Fitness', ...Array.from(new Set(trips.map((trip) => trip.category).filter(Boolean)))].filter((category, index, list) => list.indexOf(category) === index)
  const registeredState = eventState(locationLabel)
  const registeredCity = eventCity(locationLabel)
  const locationOptions = Array.from(new Set(trips.map((trip) => eventState(trip.location)).filter(Boolean))).map((state) => {
    const city = trips.map((trip) => trip.location).find((location) => eventState(location) === state)
    return `${eventCity(city)} , ${state}`.replace(' ,', ',')
  })
  const filteredTrips = trips.filter((trip) => {
    const selectedCategoryMatches = selectedCategory === 'All' || trip.category === selectedCategory || (selectedCategory === 'Yoga' && trip.category === 'Wellness')
    const haystack = [trip.title, trip.location, trip.club, trip.category].filter(Boolean).join(' ').toLowerCase()
    const locationMatches = expandLocationSearch || !registeredState || eventState(trip.location) === registeredState
    return selectedCategoryMatches && locationMatches && (!query.trim() || haystack.includes(query.trim().toLowerCase()))
  }).sort((a, b) => {
    const aCity = eventCity(a.location) === registeredCity ? 0 : 1
    const bCity = eventCity(b.location) === registeredCity ? 0 : 1
    return aCity - bCity || (a.dayIndex ?? 99) - (b.dayIndex ?? 99) || a.startMin - b.startMin || Number(b.slots) - Number(a.slots)
  })

  if (showSearchResults && query.trim()) {
    return <ExploreSearchResults query={query} trips={trips} setTab={setTab} openTrip={openTrip} openClub={openClub} openProfile={openProfile} AppIcon={AppIcon} darkMode={darkMode} onBack={() => setShowSearchResults(false)} onQueryChange={setQuery} onSubmit={() => setShowSearchResults(true)} />
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={[exploreStyles.content, { backgroundColor: background }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={exploreStyles.header}>
        <Text style={[exploreStyles.heading, { color: foreground }]}>Explore</Text>
        <View style={exploreStyles.headerActions}>
          <Pressable onPress={() => setTab('schedule')} style={[exploreStyles.iconButton, { backgroundColor: elevated, borderColor: border }]} accessibilityRole="button" accessibilityLabel="Open schedule"><AppIcon name="calendar-outline" size={19} color={foreground} /></Pressable>
          <Pressable onPress={() => setTab('feed')} style={[exploreStyles.iconButton, { backgroundColor: elevated, borderColor: border }]} accessibilityRole="button" accessibilityLabel="Open favorites and community feed"><AppIcon name="heart-outline" size={19} color="#FF7900" /></Pressable>
        </View>
      </View>

      <View style={[exploreStyles.searchBar, { backgroundColor: elevated, borderColor: border }]}>
        <AppIcon name="search-outline" size={19} color={muted} />
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => { if (query.trim()) setShowSearchResults(true) }} returnKeyType="search" placeholder="Search activities, clubs, or places" placeholderTextColor={muted} style={[exploreStyles.searchInput, { color: foreground }]} accessibilityLabel="Search activities, clubs, or places" />
        {!!query && <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search"><AppIcon name="close-circle" size={18} color={muted} /></Pressable>}
      </View>

      <View style={exploreStyles.statsRow}>
        {[['EVENTS', registered.length, 'calendar-outline', 'events'], ['SAVED', saved.length, 'bookmark-outline', 'saved'], ['MOMENTS', momentsCount, 'images-outline', 'moments']].map(([label, value, icon, kind]) => <Pressable key={label} onPress={() => openCollection?.(kind as 'events' | 'saved' | 'moments')} disabled={!openCollection} style={[exploreStyles.statCard, { backgroundColor: surface, borderColor: border }]} accessibilityRole="button" accessibilityLabel={`Open ${String(label).toLowerCase()} collection`}><AppIcon name={icon as any} size={18} color="#FF7900" /><Text style={[exploreStyles.statValue, { color: foreground }]}>{value}</Text><Text style={[exploreStyles.statLabel, { color: muted }]}>{label}</Text></Pressable>)}
      </View>

      <Pressable onPress={() => setLocationPickerVisible(true)} style={[exploreStyles.locationSelector, { backgroundColor: elevated, borderColor: border }]} accessibilityRole="button" accessibilityLabel={`Event location: ${locationLabel}`}><AppIcon name="location-outline" size={17} color="#FF7900" /><Text style={[exploreStyles.locationSelectorText, { color: foreground }]} numberOfLines={1}>{locationLabel || 'Choose your event location'}</Text><AppIcon name="chevron-down" size={16} color={muted} /></Pressable>
      {locationPickerVisible && <View style={[exploreStyles.locationMenu, { backgroundColor: surface, borderColor: border }]}><Text style={[exploreStyles.locationMenuTitle, { color: foreground }]}>Show events near</Text>{locationOptions.map((option) => <Pressable key={option} onPress={() => { onLocationChange?.(option); setExpandLocationSearch(false); setLocationPickerVisible(false) }} style={exploreStyles.locationOption}><Text style={[exploreStyles.locationOptionText, { color: foreground }]}>{option}</Text></Pressable>)}<Pressable onPress={() => { setExpandLocationSearch(true); setLocationPickerVisible(false) }} style={exploreStyles.locationOption}><Text style={[exploreStyles.locationOptionText, { color: '#FF7900' }]}>All states</Text></Pressable></View>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={exploreStyles.categoryRow}>
        {categories.map((category) => {
          const selected = selectedCategory === category
          return <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[exploreStyles.categoryPill, { backgroundColor: selected ? '#FF7900' : elevated, borderColor: selected ? '#FF7900' : border }]} accessibilityRole="radio" accessibilityState={{ selected }}><Text style={[exploreStyles.categoryText, { color: selected ? '#FFFFFF' : foreground }]}>{category}</Text></Pressable>
        })}
      </ScrollView>

      <View style={exploreStyles.sectionHeader}><Text style={[exploreStyles.sectionTitle, { color: foreground }]}>Upcoming near you</Text><Pressable onPress={() => setTab('schedule')} accessibilityRole="button" accessibilityLabel="Open full schedule"><Text style={exploreStyles.sectionAction}>See all</Text></Pressable></View>
      <FlatList data={filteredTrips.slice(0, 6)} horizontal keyExtractor={(trip) => trip.id} showsHorizontalScrollIndicator={false} contentContainerStyle={exploreStyles.activityRow} onLayout={({ nativeEvent: { layout } }) => { if (__DEV__) console.log('[Explore layout] events', { count: filteredTrips.slice(0, 6).length, width: Math.round(layout.width), height: Math.round(layout.height) }) }} renderItem={({ item: trip }) => <ActivityCard trip={trip} saved={saved.includes(trip.id)} onPress={() => openTrip(trip)} onToggleSaved={toggleSaved ? () => toggleSaved(trip.id) : undefined} foreground={foreground} muted={muted} surface={surface} border={border} AppIcon={AppIcon} />} />
      {!filteredTrips.length && <View><Text style={[exploreStyles.emptyText, { color: muted }]}>{query || selectedCategory !== 'All' ? 'No matching experiences found.' : registeredState && !expandLocationSearch ? `No upcoming events are available in ${registeredState}.` : 'No upcoming experiences are available right now.'}</Text>{registeredState && !expandLocationSearch && <Pressable onPress={() => setExpandLocationSearch(true)} style={exploreStyles.expandButton}><Text style={exploreStyles.expandButtonText}>Search all states</Text></Pressable>}</View>}

      <View style={exploreStyles.sectionHeader}><Text style={[exploreStyles.sectionTitle, { color: foreground }]}>Community moments</Text><Text style={[exploreStyles.sectionAction, { color: muted }]}>From the community</Text></View>
      <View style={styles.mediaGrid} onLayout={({ nativeEvent: { layout } }) => { if (__DEV__) console.log('[Explore layout] moments', { count: moments.length, width: Math.round(layout.width), height: Math.round(layout.height) }) }}>
        {moments.map((item, index) => <Pressable key={item.id} style={({ pressed }) => [styles.mediaTile, { width: index % 3 === 0 ? '100%' : '48%', height: index % 3 === 0 ? 220 : 155, backgroundColor: surface, borderColor: border, opacity: pressed ? 0.82 : 1 }]} onPress={() => openMoment ? openMoment(item) : setTab('feed')} accessibilityRole="button" accessibilityLabel={`Open community moment: ${item.text ?? item.caption ?? 'Photo'}`}><Image source={item.imageSource ?? { uri: item.thumbnail ?? item.image ?? item.imageUrl }} style={styles.mediaImage} /><View style={styles.mediaOverlay}><Text style={styles.mediaCaption} numberOfLines={2}>{item.text ?? item.caption ?? 'Community moment'}</Text><Text style={styles.mediaLikes}><AppIcon name={item.mediaType === 'video' ? 'videocam' : 'heart'} size={13} color={colors.white} /> {item.mediaType === 'video' ? 'Video' : item.likes ?? 0}</Text></View></Pressable>)}
      </View>
      {!moments.length && <Text style={[exploreStyles.emptyText, { color: muted }]}>Published community moments will appear here.</Text>}
    </ScrollView>
  )
}

const exploreStyles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 152 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  heading: { fontSize: 31, lineHeight: 38, fontWeight: '900', letterSpacing: -1.1 },
  headerActions: { flexDirection: 'row', gap: 9 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  searchBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderRadius: 19, borderWidth: 1, marginBottom: 15 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13, paddingVertical: 0 },
  locationSelector: { minHeight: 44, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  locationSelectorText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '800' },
  locationMenu: { borderRadius: 18, borderWidth: 1, padding: 10, marginTop: -7, marginBottom: 15 },
  locationMenuTitle: { fontSize: 12, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 7 },
  locationOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10 },
  locationOptionText: { fontSize: 12, fontWeight: '800' },
  expandButton: { alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FF7900', marginBottom: 20 },
  expandButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  categoryRow: { gap: 8, paddingBottom: 18 },
  categoryPill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 24 },
  statCard: { flex: 1, minHeight: 88, padding: 12, borderRadius: 19, borderWidth: 1, justifyContent: 'center' },
  statValue: { fontSize: 22, lineHeight: 26, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  sectionHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.35 },
  sectionAction: { color: '#FF7900', fontSize: 12, fontWeight: '900' },
  activityRow: { gap: 12, paddingBottom: 25 },
  activityCard: { width: 286, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  activityImageWrap: { height: 154, position: 'relative', backgroundColor: '#25272B' },
  activityImage: { width: '100%', height: '100%' },
  activityImageShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  activityCategory: { position: 'absolute', left: 13, bottom: 12, color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  saveButton: { position: 'absolute', right: 11, top: 11, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,10,12,0.72)' },
  activityBody: { minHeight: 166, padding: 14 },
  activityTitle: { minHeight: 43, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  activityMeta: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  activityOrganizer: { fontSize: 11, lineHeight: 16, fontWeight: '800', marginTop: 8 },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  registeredPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: '#FF790022' },
  registeredText: { color: '#FF7900', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  demoPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: '#FFFFFF16' },
  demoText: { color: '#A1A1AA', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  emptyText: { fontSize: 12, marginBottom: 22 },
})
