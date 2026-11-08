import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { activityCatalog, sportAssetRegistry } from './activityCatalog'
import { supabaseClient } from './supabase'

type SearchResultType = 'All' | 'People' | 'Clubs' | 'Sports' | 'Experiences'

type ExploreSearchResultsProps = {
  query: string
  trips: Array<any>
  setTab: (tab: any) => void
  openTrip: (trip: any) => void
  openClub: (clubId: string) => void
  openProfile: (profileId: string) => void
  AppIcon: (props: any) => React.ReactNode
  darkMode?: boolean
  onBack: () => void
  onQueryChange: (value: string) => void
  onSubmit: () => void
}

type RemoteResult = { id: string; title: string; subtitle: string; imageUrl?: string | null; isPerson?: boolean }

async function resolveClubImage(value: string | null | undefined) {
  if (!value || value.startsWith('http') || !supabaseClient) return value ?? null
  const { data, error } = await supabaseClient.storage.from('club-media').createSignedUrl(value, 60 * 60)
  return error ? null : data?.signedUrl ?? null
}

export function ExploreSearchResults({ query, trips, setTab, openTrip, openClub, openProfile, AppIcon, darkMode = false, onBack, onQueryChange, onSubmit }: ExploreSearchResultsProps) {
  const [selectedType, setSelectedType] = useState<SearchResultType>('All')
  const [people, setPeople] = useState<RemoteResult[]>([])
  const [clubs, setClubs] = useState<RemoteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const foreground = darkMode ? '#F5F5F5' : '#171C19'
  const muted = darkMode ? '#A1A1AA' : '#68736B'
  const surface = darkMode ? '#17191D' : '#FFFFFF'
  const elevated = darkMode ? '#24262B' : '#F8FAF7'
  const border = darkMode ? '#303238' : '#E7EAE4'
  const searchTerm = query.trim().replace(/^@/, '').replace(/[,%()]/g, ' ').trim()
  const term = searchTerm.toLowerCase()

  useEffect(() => {
    let cancelled = false
    const loadRemoteResults = async () => {
      if (!searchTerm || !supabaseClient) {
        setPeople([])
        setClubs([])
        setError(!supabaseClient && term ? 'Connect Supabase to search people and clubs.' : null)
        return
      }
      setLoading(true)
      setError(null)
      const [usernameResponse, displayNameResponse, clubsResponse] = await Promise.all([
        supabaseClient.from('profiles').select('id, username, display_name, bio, avatar_url').ilike('username', `%${searchTerm}%`).limit(20),
        supabaseClient.from('profiles').select('id, username, display_name, bio, avatar_url').ilike('display_name', `%${searchTerm}%`).limit(20),
        supabaseClient.from('clubs').select('id, name, description, activity, location, image_url, cover_image_url').or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,activity.ilike.%${searchTerm}%`).eq('visibility', 'public').limit(20),
      ])
      if (cancelled) return
      if (usernameResponse.error || displayNameResponse.error || clubsResponse.error) setError('Some shared results could not be loaded.')
      const profilesById = new Map<string, any>()
      for (const profile of [...(usernameResponse.data ?? []), ...(displayNameResponse.data ?? [])]) profilesById.set(profile.id, profile)
      setPeople(Array.from(profilesById.values()).map((profile: any) => ({ id: profile.id, title: profile.display_name || 'FitHive athlete', subtitle: profile.username ? `@${profile.username}${profile.bio ? ` · ${profile.bio}` : ''}` : 'Username not set', imageUrl: profile.avatar_url, isPerson: true })))
      const clubResults = await Promise.all((clubsResponse.data ?? []).map(async (club: any) => ({ id: club.id, title: club.name, subtitle: [club.activity, club.location].filter(Boolean).join(' · ') || club.description || 'Public FitHive club', imageUrl: await resolveClubImage(club.cover_image_url || club.image_url) })))
      setClubs(clubResults)
      setLoading(false)
    }
    void loadRemoteResults()
    return () => { cancelled = true }
  }, [term])

  const experienceResults = useMemo(() => trips.filter((trip) => [trip.title, trip.location, trip.club, trip.category].filter(Boolean).join(' ').toLowerCase().includes(term)), [term, trips])
  const sportResults = useMemo(() => activityCatalog.filter((sport) => sport.name.toLowerCase().includes(term)), [term])
  const show = (type: SearchResultType) => selectedType === 'All' || selectedType === type
  const count = people.length + clubs.length + sportResults.length + experienceResults.length
  const categories: SearchResultType[] = ['All', 'People', 'Clubs', 'Sports', 'Experiences']

  const ResultRow = ({ result, icon, onPress }: { result: RemoteResult; icon: any; onPress?: () => void }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, marginBottom: 9 }} accessibilityRole={onPress ? 'button' : undefined}>
      {result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={{ width: 46, height: 46, borderRadius: result.isPerson ? 23 : 14 }} /> : <View style={{ width: 46, height: 46, borderRadius: result.isPerson ? 23 : 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F22' }}><AppIcon name={icon} size={21} color="#FF5A1F" /></View>}
      <View style={{ flex: 1 }}><Text style={{ color: foreground, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>{result.title}</Text><Text style={{ color: muted, fontSize: 11, marginTop: 3 }} numberOfLines={2}>{result.subtitle}</Text></View>
      {onPress && <AppIcon name="chevron-forward" size={17} color={muted} />}
    </Pressable>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#090A0C' : '#F5F6F2' }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 34 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}><Pressable onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }} accessibilityLabel="Back to Explore"><AppIcon name="arrow-back" color={foreground} /></Pressable><View><Text style={{ color: foreground, fontSize: 24, fontWeight: '900' }}>Search results</Text><Text style={{ color: muted, fontSize: 11, marginTop: 2 }}>Showing matches for “{query.trim()}”</Text></View></View>
      <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: elevated, borderWidth: 1, borderColor: border, marginBottom: 13 }}><AppIcon name="search-outline" color={muted} /><TextInput value={query} onChangeText={onQueryChange} onSubmitEditing={onSubmit} returnKeyType="search" placeholder="Search people, clubs, sports, or experiences" placeholderTextColor={muted} style={{ flex: 1, color: foreground, fontSize: 13 }} accessibilityLabel="Search all FitHive results" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 17 }}>{categories.map((category) => <Pressable key={category} onPress={() => setSelectedType(category)} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 19, backgroundColor: selectedType === category ? '#FF5A1F' : elevated, borderWidth: 1, borderColor: selectedType === category ? '#FF5A1F' : border }}><Text style={{ color: selectedType === category ? '#FFFFFF' : foreground, fontSize: 11, fontWeight: '800' }}>{category}</Text></Pressable>)}</ScrollView>
      {loading && <View style={{ alignItems: 'center', paddingVertical: 22 }}><ActivityIndicator color="#FF5A1F" /><Text style={{ color: muted, fontSize: 12, marginTop: 8 }}>Searching FitHive…</Text></View>}
      {!!error && <Text style={{ color: muted, fontSize: 12, marginBottom: 14 }}>{error}</Text>}
      {!loading && !count && <View style={{ padding: 22, borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border }}><AppIcon name="search-outline" size={26} color="#FF5A1F" /><Text style={{ color: foreground, fontSize: 16, fontWeight: '800', marginTop: 10 }}>No results yet</Text><Text style={{ color: muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Try a person, club, sport, or destination.</Text></View>}
      {show('People') && people.length > 0 && <View><Text style={{ color: foreground, fontSize: 18, fontWeight: '900', marginBottom: 10 }}>People</Text>{people.map((result) => <ResultRow key={result.id} result={result} icon="person-outline" onPress={() => openProfile(result.id)} />)}</View>}
      {show('Clubs') && clubs.length > 0 && <View style={{ marginTop: 10 }}><Text style={{ color: foreground, fontSize: 18, fontWeight: '900', marginBottom: 10 }}>Clubs</Text>{clubs.map((result) => <ResultRow key={result.id} result={result} icon="people-outline" onPress={() => openClub(result.id)} />)}</View>}
      {show('Sports') && sportResults.length > 0 && <View style={{ marginTop: 10 }}><Text style={{ color: foreground, fontSize: 18, fontWeight: '900', marginBottom: 10 }}>Sports</Text>{sportResults.map((sport) => <ResultRow key={sport.name} result={{ id: sport.name, title: sport.name, subtitle: `${sport.category} · ${sport.tracksRoute ? 'Route tracking available' : 'Activity tracking'}`, imageUrl: sportAssetRegistry[sport.name] ? undefined : null }} icon="navigate-outline" onPress={() => setTab('activity')} />)}</View>}
      {show('Experiences') && experienceResults.length > 0 && <View style={{ marginTop: 10 }}><Text style={{ color: foreground, fontSize: 18, fontWeight: '900', marginBottom: 10 }}>Experiences</Text>{experienceResults.map((trip) => <ResultRow key={trip.id} result={{ id: trip.id, title: trip.title, subtitle: [trip.location, trip.category, trip.locationNote].filter(Boolean).join(' · '), imageUrl: trip.image }} icon="calendar-outline" onPress={() => openTrip(trip)} />)}</View>}
    </ScrollView>
  )
}
