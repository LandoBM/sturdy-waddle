import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { theme } from '../src/theme'

export type ProfileScreenProps = {
  styles: Record<string, any>
  accountHandle: string
  accountUsername: string
  profileName: string
  profileBio: string
  profileAvatarUrl: string | null
  scheduleIds: string[]
  myPosts: Array<any>
  followersCount: number
  followingCount: number
  joined: string[]
  scheduleTrips: Array<any>
  ownerStatus: string
  dark: boolean
  badgeForClub: (id: string, index: number) => any
  clubById: (id: string) => any
  setTab: (tab: any) => void
  setSettingsVisible: (visible: boolean) => void
  setSelectedClub: (club: any) => void
  openTrip: (trip: any) => void
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  setCommentsPostId: (id: string) => void
  onDeletePost?: (id: string) => void
  ScreenHeader: (props: any) => ReactNode
  Avatar: (props: any) => ReactNode
  ClubBadgeView: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  PostCard: (props: any) => ReactNode
  AppIcon: (props: any) => ReactNode
  activityStore?: { points?: number; history?: Array<any> }
}

export function ProfileScreen({ styles, accountHandle, accountUsername, profileName, profileBio, profileAvatarUrl, scheduleIds, myPosts, followersCount, followingCount, joined, scheduleTrips, ownerStatus, dark, badgeForClub, clubById, setTab, setSettingsVisible, setSelectedClub, openTrip, toggleLike, toggleSave, setCommentsPostId, onDeletePost, ScreenHeader, Avatar, ClubBadgeView, SectionTitle, PostCard, AppIcon, activityStore }: ProfileScreenProps) {
  const background = dark ? theme.colors.dark : theme.colors.paper
  const surface = dark ? theme.colors.darkSurface : '#FFFFFF'
  const elevated = dark ? theme.colors.darkElevated : '#FFFFFF'
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const muted = dark ? theme.colors.darkMuted : theme.colors.muted
  const border = dark ? theme.colors.darkBorder : theme.colors.line
  const favoriteSports = Array.from(new Set(scheduleTrips.map((trip) => trip.category).filter(Boolean))).slice(0, 4)
  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32, paddingTop: 16 }}>
      <ScreenHeader title={accountHandle} centerTitle action={<View style={styles.profileHeaderActions}><Pressable style={styles.roundAction} accessibilityRole="button" accessibilityLabel="Open schedule" onPress={() => setTab('schedule')}><AppIcon name="calendar-outline" /></Pressable><Pressable style={styles.roundAction} accessibilityRole="button" accessibilityLabel="Edit profile settings" onPress={() => setSettingsVisible(true)}><AppIcon name="settings-outline" /></Pressable></View>} />
      <View style={{ borderRadius: 28, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 16, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 14, elevation: 3 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar name={accountUsername} size={82} photoUri={profileAvatarUrl} /><View style={{ marginLeft: 16, flex: 1 }}><Text style={{ color: foreground, fontSize: 21, fontWeight: '900' }}>{profileName || accountHandle}</Text><Text style={{ color: muted, fontSize: 11, marginTop: 3 }}>FitHive member</Text><View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', paddingRight: 8 }}>{[['EVENTS', scheduleIds.length], ['POSTS', myPosts.length], ['FOLLOWERS', followersCount], ['FOLLOWING', followingCount]].map(([label, value]) => <View key={String(label)} style={{ alignItems: 'center' }}><Text style={{ color: foreground, fontSize: 16, fontWeight: '900' }}>{value}</Text><Text style={{ color: muted, fontSize: 9, marginTop: 2 }}>{label}</Text></View>)}</View></View></View><Text style={{ color: muted, fontSize: 12, lineHeight: 18, marginTop: 16 }}>{profileBio || 'Add a bio to tell the FitHive community about you.'}</Text><View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: border }}><Text style={{ color: muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>REWARDS</Text><Text style={{ color: theme.colors.accent, fontSize: 25, fontWeight: '900', marginTop: 4 }}>{activityStore?.points ?? 0} <Text style={{ color: muted, fontSize: 11 }}>points</Text></Text><Text style={{ color: muted, fontSize: 10, marginTop: 2 }}>{activityStore?.history?.length ? `${activityStore.history.length} completed activities` : 'Complete an activity to start earning rewards.'}</Text></View>{!!joined.length && <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: border }}><Text style={{ color: muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10 }}>ACHIEVEMENTS</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{joined.map((id, index) => { const club = clubById(id); return <Pressable key={id} onPress={() => setSelectedClub(club)} accessibilityRole="button" accessibilityLabel={`Open ${club.name} club page`}><ClubBadgeView badge={badgeForClub(id, index)} /></Pressable> })}</View></View>}<View style={styles.accountActions}><Pressable style={[styles.accountAction, { backgroundColor: elevated, borderColor: border }]} onPress={() => setTab('owner')}><Text style={[styles.simpleRowTitle, { color: foreground }]}>{ownerStatus === 'verified' ? 'Manage your clubs' : ownerStatus === 'pending' ? 'Finish club owner verification' : 'Get club owner certified'}</Text><Text style={[styles.simpleRowSub, { color: muted }]}>{ownerStatus === 'verified' ? 'Manage clubs and members.' : 'Verify your owner access.'}</Text></Pressable></View></View>
      <View style={{ marginTop: 16, padding: 15, borderRadius: 22, backgroundColor: elevated, borderWidth: 1, borderColor: border }}><Text style={{ color: foreground, fontSize: 17, fontWeight: '900' }}>Favorite sports</Text>{favoriteSports.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>{favoriteSports.map((sport) => <View key={sport} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FF5A1F20' }}><Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '800' }}>{sport}</Text></View>)}</View> : <Text style={{ color: muted, fontSize: 11, marginTop: 7 }}>Your favorite sports will appear after you add an event.</Text>}</View>
      <SectionTitle title="Events" action="Schedule" onPress={() => setTab('schedule')} />
      {scheduleTrips.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-1">{scheduleTrips.map((trip) => <Pressable key={trip.id} onPress={() => openTrip(trip)} className="w-[156px] rounded-[22px] border border-[#dfe7d9] bg-white p-3 shadow-md dark:border-[#2a3b30] dark:bg-[#132018]" accessibilityRole="button" accessibilityLabel={`Open ${trip.title} on ${trip.shortDate}`}><View className="mb-3 h-10 w-10 items-center justify-center rounded-[14px] bg-accent-200"><AppIcon name="calendar-outline" size={19} /></View><Text className="text-[12px] font-extrabold leading-[17px] text-ink dark:text-[#f3f7f0]" numberOfLines={2}>{trip.title}</Text><Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-[#9eafa2]">{trip.shortDay}, {trip.shortDate}</Text></Pressable>)}</ScrollView> : <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-5 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your scheduled events will appear here.</Text>}
      <SectionTitle title="Recently posted" />{!myPosts.length && <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-6 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your recent posts will appear here.</Text>}{myPosts.map((post) => <PostCard key={post.id} post={post} photoUri={profileAvatarUrl} dark={dark} following={false} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} onComments={() => setCommentsPostId(post.id)} onDelete={onDeletePost ? () => onDeletePost(post.id) : undefined} onToggleFollow={() => {}} />)}
    </ScrollView>
  )
}
