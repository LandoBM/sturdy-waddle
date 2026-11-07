import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ReactNode } from 'react'

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
  ScreenHeader: (props: any) => ReactNode
  Avatar: (props: any) => ReactNode
  ClubBadgeView: (props: any) => ReactNode
  SectionTitle: (props: any) => ReactNode
  PostCard: (props: any) => ReactNode
  AppIcon: (props: any) => ReactNode
}

export function ProfileScreen({ styles, accountHandle, accountUsername, profileName, profileBio, profileAvatarUrl, scheduleIds, myPosts, followersCount, followingCount, joined, scheduleTrips, ownerStatus, dark, badgeForClub, clubById, setTab, setSettingsVisible, setSelectedClub, openTrip, toggleLike, toggleSave, setCommentsPostId, ScreenHeader, Avatar, ClubBadgeView, SectionTitle, PostCard, AppIcon }: ProfileScreenProps) {
  return (
    <ScrollView className="flex-1 bg-[#e9eee4] dark:bg-[#07110d]" contentContainerClassName="px-[18px] pb-7 pt-4">
      <ScreenHeader title={accountHandle} centerTitle action={<View style={styles.profileHeaderActions}><Pressable style={styles.roundAction} accessibilityRole="button" accessibilityLabel="Open schedule" onPress={() => setTab('schedule')}><AppIcon name="calendar-outline" /></Pressable><Pressable style={styles.roundAction} accessibilityRole="button" accessibilityLabel="Edit profile settings" onPress={() => setSettingsVisible(true)}><AppIcon name="settings-outline" /></Pressable></View>} />
      <View className="rounded-[28px] border border-[#dfe7d9] bg-white p-4 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]"><View className="flex-row items-center"><Avatar name={accountUsername} size={82} photoUri={profileAvatarUrl} /><View className="ml-4 flex-1"><Text className="text-[20px] font-extrabold text-ink dark:text-[#f3f7f0]">{profileName || accountHandle}</Text><View className="mt-3 flex-row justify-between pr-2"><View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{scheduleIds.length}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Events</Text></View><View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{myPosts.length}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Posts</Text></View><View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{followersCount}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Followers</Text></View><View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{followingCount}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Following</Text></View></View></View></View><Text className="mt-4 text-xs leading-[18px] text-slate-500 dark:text-[#9eafa2]">{profileBio || 'Add a bio to tell the FitHive community about you.'}</Text>{!!joined.length && <View className="mt-4 border-t border-[#edf0e7] pt-4 dark:border-[#294032]"><Text className="mb-3 text-[10px] font-extrabold uppercase tracking-[1px] text-slate-500 dark:text-[#9eafa2]">Club badges</Text><View className="flex-row flex-wrap gap-3">{joined.map((id, index) => { const club = clubById(id); return <Pressable key={id} onPress={() => setSelectedClub(club)} accessibilityRole="button" accessibilityLabel={`Open ${club.name} club page`}><ClubBadgeView badge={badgeForClub(id, index)} /></Pressable> })}</View></View>}<View style={styles.accountActions}><Pressable style={styles.accountAction} className="border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]" onPress={() => setTab('owner')}><Text style={styles.simpleRowTitle} className="dark:text-[#f3f7f0]">{ownerStatus === 'verified' ? 'Manage your clubs' : ownerStatus === 'pending' ? 'Finish club owner verification' : 'Get club owner certified'}</Text><Text style={styles.simpleRowSub} className="dark:text-[#9eafa2]">{ownerStatus === 'verified' ? 'Create club pages and manage members and updates.' : 'Confirm your email and review the draft owner documents.'}</Text></Pressable></View></View>
      <SectionTitle title="Events" action="Schedule" onPress={() => setTab('schedule')} />
      {scheduleTrips.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-1">{scheduleTrips.map((trip) => <Pressable key={trip.id} onPress={() => openTrip(trip)} className="w-[156px] rounded-[22px] border border-[#dfe7d9] bg-white p-3 shadow-md dark:border-[#2a3b30] dark:bg-[#132018]" accessibilityRole="button" accessibilityLabel={`Open ${trip.title} on ${trip.shortDate}`}><View className="mb-3 h-10 w-10 items-center justify-center rounded-[14px] bg-accent-200"><AppIcon name="calendar-outline" size={19} /></View><Text className="text-[12px] font-extrabold leading-[17px] text-ink dark:text-[#f3f7f0]" numberOfLines={2}>{trip.title}</Text><Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-[#9eafa2]">{trip.shortDay}, {trip.shortDate}</Text></Pressable>)}</ScrollView> : <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-5 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your scheduled events will appear here.</Text>}
      <SectionTitle title="Recently posted" />{!myPosts.length && <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-6 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your recent posts will appear here.</Text>}{myPosts.map((post) => <PostCard key={post.id} post={post} photoUri={profileAvatarUrl} dark={dark} following={false} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} onComments={() => setCommentsPostId(post.id)} onToggleFollow={() => {}} />)}
    </ScrollView>
  )
}
