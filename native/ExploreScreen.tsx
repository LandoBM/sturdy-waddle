import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import type { ReactNode } from 'react'

export type ExploreScreenProps = {
  styles: Record<string, any>
  colors: { white: string }
  trips: Array<any>
  media: Array<any>
  reserved: string[]
  setTab: (tab: any) => void
  openTrip: (trip: any) => void
  ScreenHeader: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  TripCard: (props: any) => ReactNode
  AppIcon: (props: any) => ReactNode
  darkMode?: boolean
}

export function ExploreScreen({ styles, colors, trips, media, reserved, setTab, openTrip, ScreenHeader, SectionTitle, TripCard, AppIcon, darkMode = false }: ExploreScreenProps) {
  const background = darkMode ? '#080B09' : '#F5F6F2'
  const surface = darkMode ? '#171C19' : '#FFFFFF'
  const foreground = darkMode ? '#F8FAF7' : '#171C19'
  const muted = darkMode ? '#A9B3A9' : '#68736B'
  const border = darkMode ? '#2B332D' : '#E7EAE4'
  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ backgroundColor: background, paddingHorizontal: 18, paddingBottom: 28, paddingTop: 16 }}>
      <ScreenHeader title="Explore" />
      <View style={{ marginBottom: 8, borderRadius: 24, borderWidth: 1, borderColor: darkMode ? '#6C4325' : '#FFD1B3', backgroundColor: darkMode ? '#2A1D14' : '#FFF4EB', padding: 20 }}>
        <Text style={{ color: foreground, fontSize: 25, fontWeight: '800', letterSpacing: -0.8 }}>A little more outside.</Text>
        <Text style={{ color: muted, fontSize: 13, lineHeight: 19, marginTop: 4 }}>Find your next favorite place, activity, or crew.</Text>
      </View>
      <SectionTitle title="Upcoming near you" action="Schedule" onPress={() => setTab('schedule')} />
      {trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
      <SectionTitle title="Community moments" />
      <View style={styles.mediaGrid}>
        {media.map((item) => (
          <Pressable key={item.id} style={[styles.mediaTile, { backgroundColor: surface, borderColor: border }]} className="overflow-hidden rounded-[22px] shadow-lg" onPress={() => setTab('feed')}>
            <Image source={{ uri: item.image }} style={styles.mediaImage} />
            <View style={styles.mediaOverlay}><Text style={styles.mediaCaption} numberOfLines={2}>{item.caption}</Text><Text style={styles.mediaLikes}><AppIcon name="heart" size={13} color={colors.white} /> {item.likes}</Text></View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
