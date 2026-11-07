import Svg, { Circle, Line, Polyline } from 'react-native-svg'
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

function ExploreTrend({ values, darkMode, foreground, muted, surface }: { values: number[]; darkMode: boolean; foreground: string; muted: string; surface: string }) {
  if (!values.length) return null
  const width = 320
  const height = 112
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => {
    const x = 10 + (index / Math.max(values.length - 1, 1)) * 300
    const y = 88 - (value / max) * 66
    return `${x},${y}`
  }).join(' ')
  return (
    <View style={{ marginTop: 16 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[22, 55, 88].map((y) => <Line key={y} x1="10" x2="310" y1={y} y2={y} stroke={darkMode ? '#303630' : '#E7EAE4'} strokeWidth="1" />)}
        <Polyline points={points} fill="none" stroke="#FF7900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => { const x = 10 + (index / Math.max(values.length - 1, 1)) * 300; const y = 88 - (value / max) * 66; return <Circle key={`${value}-${index}`} cx={x} cy={y} r="4" fill="#FF7900" stroke={surface} strokeWidth="2" /> })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}><Text style={{ color: muted, fontSize: 9 }}>Recent</Text><Text style={{ color: foreground, fontSize: 10, fontWeight: '800' }}>{Math.round(values.reduce((sum, value) => sum + value, 0))} likes</Text><Text style={{ color: muted, fontSize: 9 }}>Now</Text></View>
    </View>
  )
}

export function ExploreScreen({ styles, colors, trips, media, reserved, setTab, openTrip, ScreenHeader, SectionTitle, TripCard, AppIcon, darkMode = false }: ExploreScreenProps) {
  const background = darkMode ? '#080B09' : '#F5F6F2'
  const surface = darkMode ? '#171C19' : '#FFFFFF'
  const foreground = darkMode ? '#F8FAF7' : '#171C19'
  const muted = darkMode ? '#A9B3A9' : '#68736B'
  const border = darkMode ? '#2B332D' : '#E7EAE4'
  const elevated = darkMode ? '#222622' : '#FFFFFF'
  const softAccent = darkMode ? '#2A1D14' : '#FFF4EB'
  const heroImage = trips[0]?.image ?? media[0]?.image
  const trendValues = media.slice(0, 7).map((item) => Number(item.likes) || 0)
  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ backgroundColor: background, paddingHorizontal: 18, paddingBottom: 34, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View><Text style={{ color: foreground, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>Explore</Text><Text style={{ color: muted, fontSize: 11, marginTop: 3 }}>Find your next move</Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }} onPress={() => setTab('schedule')} accessibilityLabel="Open schedule"><AppIcon name="calendar-outline" size={18} color={foreground} /></Pressable><Pressable style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7900' }} onPress={() => setTab('feed')} accessibilityLabel="Open community feed"><AppIcon name="heart-outline" size={18} color="#FFFFFF" /></Pressable></View>
      </View>
      <View style={{ marginBottom: 18, minHeight: 205, borderRadius: 26, overflow: 'hidden', backgroundColor: softAccent, borderWidth: 1, borderColor: darkMode ? '#6C4325' : '#FFD1B3', shadowColor: '#171C19', shadowOffset: { width: 0, height: 9 }, shadowOpacity: darkMode ? 0.28 : 0.1, shadowRadius: 18, elevation: 4 }}>
        {heroImage && <Image source={{ uri: heroImage }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: darkMode ? 0.64 : 0.78 }} resizeMode="cover" />}
        <View style={{ flex: 1, minHeight: 205, justifyContent: 'flex-end', padding: 18, backgroundColor: darkMode ? 'rgba(8,11,9,0.5)' : 'rgba(255,244,235,0.35)' }}>
          <Text style={{ color: '#FFB067', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }}>GET OUT THERE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 5 }}>A little more outside.</Text>
          <Text style={{ color: '#F3F4F0', fontSize: 12, lineHeight: 18, marginTop: 5 }}>Find your next favorite place, activity, or crew.</Text>
          <Pressable onPress={() => setTab('schedule')} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 22, backgroundColor: '#FF7900', marginTop: 13, opacity: pressed ? 0.8 : 1 })} accessibilityRole="button" accessibilityLabel="Browse upcoming activities"><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>Browse plans</Text><AppIcon name="arrow-forward" size={15} color="#FFFFFF" /></Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[['EVENTS', trips.length.toString(), 'calendar-outline'], ['SAVED', reserved.length.toString(), 'bookmark-outline'], ['MOMENTS', media.length.toString(), 'images-outline']].map(([label, value, icon]) => <View key={label} style={{ flex: 1, minHeight: 76, justifyContent: 'center', padding: 12, borderRadius: 18, backgroundColor: elevated, borderWidth: 1, borderColor: border }}><AppIcon name={icon as any} size={16} color="#FF7900" /><Text style={{ color: foreground, fontSize: 19, fontWeight: '900', marginTop: 5 }}>{value}</Text><Text style={{ color: muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 }}>{label}</Text></View>)}
      </View>
      <View style={{ marginBottom: 20, padding: 16, borderRadius: 24, backgroundColor: elevated, borderWidth: 1, borderColor: border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: foreground, fontSize: 17, fontWeight: '900' }}>Community pulse</Text><Text style={{ color: muted, fontSize: 10, marginTop: 3 }}>Engagement from recent moments</Text></View><View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7900' }}><AppIcon name="trending-up" size={17} color="#FFFFFF" /></View></View>
        <ExploreTrend values={trendValues} darkMode={darkMode} foreground={foreground} muted={muted} surface={elevated} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <View><Text style={{ color: foreground, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 }}>Upcoming near you</Text><Text style={{ color: muted, fontSize: 11, marginTop: 3 }}>Plans worth showing up for</Text></View>
        <Pressable onPress={() => setTab('schedule')} style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 20, opacity: pressed ? 0.6 : 1 })} accessibilityRole="button" accessibilityLabel="Open schedule"><Text style={{ color: '#FF7900', fontSize: 12, fontWeight: '800' }}>Schedule</Text></Pressable>
      </View>
      {trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 11 }}>
        <View><Text style={{ color: foreground, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 }}>Community moments</Text><Text style={{ color: muted, fontSize: 11, marginTop: 3 }}>See what the FitHive community is up to</Text></View>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }}><AppIcon name="heart-outline" size={17} color="#FF7900" /></View>
      </View>
      <View style={[styles.mediaGrid, { gap: 10 }]}>
        {media.map((item) => (
          <Pressable key={item.id} style={({ pressed }) => [styles.mediaTile, { width: '48%', backgroundColor: surface, borderColor: border, shadowColor: '#171C19', shadowOffset: { width: 0, height: 5 }, shadowOpacity: darkMode ? 0.22 : 0.08, shadowRadius: 12, elevation: 2, opacity: pressed ? 0.82 : 1 }]} onPress={() => setTab('feed')} accessibilityRole="button" accessibilityLabel={`Open community post: ${item.caption}`}>
            <Image source={{ uri: item.image }} style={styles.mediaImage} />
            <View style={styles.mediaOverlay}><Text style={styles.mediaCaption} numberOfLines={2}>{item.caption}</Text><Text style={styles.mediaLikes}><AppIcon name="heart" size={13} color={colors.white} /> {item.likes}</Text></View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
