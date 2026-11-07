import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { ReactNode } from 'react'
import { useColorScheme } from 'nativewind'

export type ClubsScreenProps = {
  styles: Record<string, any>
  accountUsername: string
  profileAvatarUrl: string | null
  search: string
  setSearch: (value: string) => void
  postalInput: string
  setPostalInput: (value: string) => void
  selectedClubCountry: { label: string }
  setCountryCode: (code: 'US' | 'CA' | 'GB') => void
  searchingPostalCode: boolean
  searchByPostalCode: () => Promise<void>
  locatingClubs: boolean
  findNearbyActivities: () => void
  locationLabel: string
  nearbyPlaces: Array<any>
  category: string
  categories: string[]
  setCategory: (value: any) => void
  visibleClubs: Array<{ club: any; miles: number }>
  joined: string[]
  setSelectedClub: (club: any) => void
  loadingNearbyPlaces: boolean
  nearbyPlacesError: string
  openNearbyPlace: (place: any) => Promise<void>
  managedClubs: Array<any>
  setSelectedManagedClub: (club: any) => void
  clubsLoading: boolean
  clubsError: string
  setClubsReloadKey: (update: (key: number) => number) => void
  ownerStatus: string
  setTab: (tab: any) => void
  AppIcon: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  Avatar: (props: any) => ReactNode
  ClubCard: (props: any) => ReactNode
  darkMode?: boolean
}

const clubCountries = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
] as const

export function ClubsScreen({
  styles, accountUsername, profileAvatarUrl, search, setSearch, postalInput, setPostalInput,
  selectedClubCountry, setCountryCode, searchingPostalCode, searchByPostalCode, locatingClubs,
  findNearbyActivities, locationLabel, nearbyPlaces, category, categories, setCategory, visibleClubs,
  joined, setSelectedClub, loadingNearbyPlaces, nearbyPlacesError, openNearbyPlace, managedClubs,
  setSelectedManagedClub, clubsLoading, clubsError, setClubsReloadKey, ownerStatus, setTab,
  AppIcon, SectionTitle, Avatar, ClubCard, darkMode,
}: ClubsScreenProps) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const background = dark ? '#080B09' : '#F5F6F2'
  const surface = dark ? '#171C19' : '#FFFFFF'
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? '#A9B3A9' : '#68736B'
  const border = dark ? '#2B332D' : '#E3E6DF'

  return (
    <ScrollView style={{ backgroundColor: background }} className="flex-1" contentContainerStyle={[styles.screenContent, { backgroundColor: background }]} contentContainerClassName="px-[18px] pb-8 pt-5" keyboardShouldPersistTaps="handled">
      <View style={screenStyles.brandHeader}>
        <View style={screenStyles.brandSpacer} />
        <View style={screenStyles.brandRow}><Text style={[screenStyles.wordmark, { color: foreground }]}>FitHive</Text><Text style={screenStyles.brandDot}>.</Text></View>
        <Pressable style={[screenStyles.profileButton, { backgroundColor: surface, borderColor: '#FF7900' }]} onPress={() => setTab('profile')} accessibilityLabel="Open profile">
          <Avatar name={accountUsername} size={36} photoUri={profileAvatarUrl} />
        </Pressable>
      </View>
      <Text style={[screenStyles.heading, { color: foreground }]}>Find your people.</Text>
      <Text style={[screenStyles.subheading, { color: muted }]}>Good company makes every adventure better.</Text>
      <Text style={[screenStyles.sectionEyebrow, { color: muted }]}>DISCOVER CLUBS</Text>
      <View style={[screenStyles.searchBox, { backgroundColor: surface, borderColor: border }]}>
        <AppIcon name="search-outline" color={muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search clubs" placeholderTextColor={muted} style={[styles.searchInput, { color: foreground }]} returnKeyType="search" />
      </View>
      <View style={styles.zipRow}>
        <Pressable style={[styles.zipInputBox, styles.countryCodeBox, { backgroundColor: surface, borderColor: border }]} onPress={() => Alert.alert('Choose a country', 'Club search is available in these countries.', clubCountries.map(({ code, label }) => ({ text: label, onPress: () => setCountryCode(code) })))} accessibilityRole="button" accessibilityLabel={`Country: ${selectedClubCountry.label}. Choose country`}>
          <Text style={[styles.countryCodeInput, { color: foreground }]} numberOfLines={1}>{selectedClubCountry.label}</Text>
          <AppIcon name="chevron-down" color={muted} size={14} />
        </Pressable>
        <View style={[styles.zipInputBox, { backgroundColor: surface, borderColor: border }]}>
          <AppIcon name="location-outline" color={muted} />
          <TextInput value={postalInput} onChangeText={setPostalInput} placeholder="Postal code" placeholderTextColor={muted} autoCapitalize="characters" maxLength={12} style={[styles.zipInput, { color: foreground }]} accessibilityLabel="Postal code" />
        </View>
        <Pressable style={screenStyles.updateButton} onPress={() => { void searchByPostalCode() }} disabled={searchingPostalCode}>
          <Text style={styles.searchButtonText}>{searchingPostalCode ? 'Looking up…' : 'Update'}</Text>
        </Pressable>
      </View>
      <Pressable style={[screenStyles.nearMeButton, { backgroundColor: surface, borderColor: border }]} onPress={findNearbyActivities} disabled={locatingClubs}>
        <AppIcon name="navigate-outline" color="#FF7900" />
        <Text style={[styles.nearMeText, { color: foreground }]}>{locatingClubs ? 'Finding your location…' : 'Find activities near me'}</Text>
      </Pressable>
      <View style={[screenStyles.locationBanner, { backgroundColor: dark ? '#202823' : '#FFF4EB', borderColor: '#FF7900' }]}>
        <AppIcon name="navigate-outline" color="#FF7900" />
        <Text style={[styles.locationBannerText, { color: foreground }]}>{locationLabel}<Text style={[styles.mutedText, { color: muted }]}> · {nearbyPlaces.length} places found</Text></Text>
      </View>
      <SectionTitle title="Discover clubs" />
      <Text style={[styles.nearbyAttribution, { color: muted }]}>Find nearby groups for running, hiking, cycling, wellness, and more.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
        {categories.map((item) => { const selected = category === item; return <Pressable key={item} onPress={() => setCategory(item)} style={[screenStyles.categoryChip, { backgroundColor: selected ? '#FF7900' : surface, borderColor: selected ? '#FF7900' : border }]} accessibilityRole="radio" accessibilityState={{ selected }}><Text style={[screenStyles.categoryText, { color: selected ? '#FFFFFF' : foreground }]}>{item}</Text></Pressable> })}
      </ScrollView>
      {visibleClubs.map(({ club, miles }) => <ClubCard key={club.id} club={club} miles={miles} joined={joined.includes(club.id)} onPress={() => setSelectedClub(club)} />)}
      {!visibleClubs.length && <Text style={styles.emptyText}>No clubs within 50 miles match this activity. Try another postal code or category.</Text>}
      <SectionTitle title="Places to move" />
      <Text style={[styles.nearbyAttribution, { color: muted }]}>Parks, trails, sports areas, and fitness places · Map data © OpenStreetMap contributors.</Text>
      {loadingNearbyPlaces && <Text style={[styles.simpleRowSub, { color: muted }]}>Looking for places nearby…</Text>}
      {!!nearbyPlacesError && <Text accessibilityRole="alert" style={styles.errorText}>{nearbyPlacesError}</Text>}
      {!loadingNearbyPlaces && !nearbyPlacesError && nearbyPlaces.length === 0 && <Text style={styles.emptyText}>No mapped activity spots found nearby yet. Try another postal code or use Find activities near me.</Text>}
      {nearbyPlaces.slice(0, 12).map((place) => (
        <Pressable key={place.id} style={[styles.nearbyPlaceCard, { backgroundColor: surface, borderColor: border }]} onPress={() => { void openNearbyPlace(place) }}>
          <View style={[styles.nearbyPlaceIcon, { backgroundColor: '#FF7900' }]}><AppIcon name="fitness-outline" color="#FFFFFF" /></View>
          <View style={styles.nearbyPlaceCopy}><Text style={[styles.nearbyPlaceName, { color: foreground }]}>{place.name}</Text><Text style={[styles.simpleRowSub, { color: muted }]}>{place.kind} · {place.miles.toFixed(1)} mi away</Text><Text style={[styles.nearbyPlaceActivities, { color: muted }]}>{place.activities.join(' · ')}</Text></View>
          <AppIcon name="open-outline" color={muted} size={17} />
        </Pressable>
      ))}
      {!!managedClubs.length && <SectionTitle title="Your clubs" />}
      {managedClubs.map((club) => <Pressable key={club.id} style={[styles.simpleRow, { backgroundColor: surface, borderColor: border }]} onPress={() => setSelectedManagedClub(club)}><Avatar name={club.name} size={42} /><View style={styles.simpleRowCopy}><Text style={[styles.simpleRowTitle, { color: foreground }]}>{club.name}</Text><Text style={[styles.simpleRowSub, { color: muted }]}>{[club.activity, club.location].filter(Boolean).join(' · ') || 'Community club'}</Text></View><AppIcon name="chevron-forward" color={muted} /></Pressable>)}
      {clubsLoading && <Text style={styles.simpleRowSub}>Loading community club pages…</Text>}
      {!!clubsError && <View style={styles.clubLoadError}><Text style={styles.clubLoadErrorTitle}>Couldn’t load all club data</Text><Text style={styles.clubLoadErrorText}>{clubsError}</Text><Pressable onPress={() => setClubsReloadKey((key) => key + 1)} style={styles.clubRetryButton}><Text style={styles.clubRetryText}>Try again</Text></Pressable></View>}
      {!clubsLoading && !clubsError && managedClubs.length === 0 && <View style={styles.clubEmptyCard}><Text style={styles.clubEmptyTitle}>Your account is ready for clubs</Text><Text style={styles.clubEmptyText}>Signing up creates your member profile, but not a club page. Club pages appear here after a verified club owner creates one.</Text><Pressable onPress={() => setTab('owner')} style={styles.clubRetryButton}><Text style={styles.clubRetryText}>{ownerStatus === 'verified' ? 'Manage club pages' : 'Club owner access'}</Text></Pressable></View>}
    </ScrollView>
  )
}

const screenStyles = StyleSheet.create({
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: 16 },
  brandSpacer: { width: 44 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  wordmark: { fontSize: 25, fontWeight: '800', letterSpacing: -1.1 },
  brandDot: { color: '#FF7900', fontSize: 27, fontWeight: '900' },
  profileButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 2, padding: 2 },
  heading: { fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  subheading: { marginTop: 5, marginBottom: 18, fontSize: 13, lineHeight: 19 },
  sectionEyebrow: { marginBottom: 9, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  searchBox: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderWidth: 1, borderRadius: 18, marginBottom: 10 },
  updateButton: { minWidth: 82, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#FF7900' },
  nearMeButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 16, marginBottom: 14 },
  locationBanner: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 18, marginBottom: 16 },
  categoryChip: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderWidth: 1, borderRadius: 21, marginRight: 8 },
  categoryText: { fontSize: 11, fontWeight: '700' },
})
