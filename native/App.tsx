import { Ionicons } from '@expo/vector-icons'
import { Exo2_800ExtraBold_Italic } from '@expo-google-fonts/exo-2'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { Blob as ExpoBlob } from 'expo-blob'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { areas, clubById, clubs, distanceBetweenCoordinates, media, type Category, type Club, type Coordinates } from '../src/data'
import { theme } from '../src/theme'
import { seedPosts, type Post } from '../src/posts'
import { driveMinutes, formatDuration, tripById, trips, type Trip } from '../src/trips'
import { ActivityScreen } from './ActivityScreen'
import { FeedScreen, PostCard } from './FeedScreen'
import { ClubsScreen } from './ClubsScreen'
import { ExploreScreen } from './ExploreScreen'
import { ScheduleScreen } from './ScheduleScreen'
import { ProfileScreen } from './ProfileScreen'
import { SettingsScreen } from './SettingsScreen'
import { FitnessRings, type FitnessRingValues } from './FitnessRings'
import { AuthScreen } from './AuthScreen'
import { OwnerAccessScreen } from './OwnerAccessScreen'
import { OwnerTools } from './OwnerTools'
import { fetchNearbyPlaces, lookupPostalLocation, type NearbyPlace } from './nearbyPlaces'
import {
  beginActivity,
  finishActivity,
  getActivityStore,
  pauseActivity,
  resumeActivity,
  setActivityUserId,
  type ActivityKind,
  type ActivityStore,
} from './activity'
import {
  loadDailyFitnessMetrics,
  loadHealthProvider,
  loadImportedWorkouts,
  saveHealthProvider,
  setHealthUserId,
  syncDailyFitnessMetrics,
  syncHealthWorkouts,
  type DailyFitnessMetrics,
  type ImportedWorkout,
} from './health'
import { supabaseClient } from './supabase'
import type { Session } from '@supabase/supabase-js'

type Tab = 'home' | 'schedule' | 'activity' | 'feed' | 'explore' | 'profile' | 'owner'
type IconName = ComponentProps<typeof Ionicons>['name']
type OwnerStatus = 'none' | 'pending' | 'verified'
type ClubBadge = { type: 'icon' | 'image'; value: string }
type AppearancePreference = 'system' | 'light' | 'dark'
type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  created_at: string
  read_at: string | null
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const badgeOptions: IconName[] = ['leaf-outline', 'flame-outline', 'water-outline', 'trail-sign-outline', 'sunny-outline']

function ClubBadgeView({ badge, size = 58 }: { badge: ClubBadge; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="items-center justify-center overflow-hidden border-2 border-white bg-accent-200 shadow-md dark:border-[#132018]">
      {badge.type === 'image'
        ? <Image source={{ uri: badge.value }} style={{ width: size, height: size }} />
        : <Ionicons name={badge.value as IconName} size={Math.round(size * 0.43)} color={colors.ink} />}
    </View>
  )
}
const clubCountries = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
] as const
interface ManagedClub {
  id: string
  owner_id: string
  name: string
  description: string
  activity: string
  location: string
}

interface FlightStatus {
  flightNumber: string
  status: string | null
  airline: string | null
  departureAirport: string | null
  departureTerminal: string | null
  departureGate: string | null
  scheduledDeparture: string | null
  actualDeparture: string | null
  arrivalAirport: string | null
  arrivalTerminal: string | null
  arrivalGate: string | null
  scheduledArrival: string | null
  actualArrival: string | null
}

const colors = {
  ink: theme.colors.ink,
  muted: theme.colors.muted,
  paper: theme.colors.paper,
  white: '#FFFFFF',
  lime: theme.colors.accent,
  blue: '#5c78ff',
  pink: '#ff8fa4',
  line: theme.colors.line,
}

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Clubs', icon: 'people-outline' },
  { id: 'activity', label: 'Track', icon: 'navigate-outline' },
  { id: 'feed', label: 'Feed', icon: 'heart-outline' },
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
]

const activeTabIcons: Partial<Record<Tab, IconName>> = {
  home: 'people',
  activity: 'navigate',
  feed: 'heart',
  explore: 'compass',
}

const categories: ('All' | Category)[] = [
  'All',
  'Hiking',
  'Climbing',
  'Water',
  'Cycling',
  'Running',
  'Wellness',
  'Camping',
  'Team sports',
]

function AppIcon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />
}

function ScreenHeader({ title, action, centerTitle = false, wordmark = false }: { title: string; action?: ReactNode; centerTitle?: boolean; wordmark?: boolean }) {
  return (
    <View style={styles.screenHeader} className="mb-5 flex-row items-end justify-between">
      {centerTitle && <View style={styles.screenHeaderSpacer} />}
      <View style={[styles.screenHeading, centerTitle && styles.screenHeadingCentered]}>
        <Text style={[styles.screenTitle, centerTitle && styles.screenTitleCentered, wordmark && styles.screenWordmark]} className="text-ink dark:text-[#f3f7f0]" numberOfLines={1} adjustsFontSizeToFit={centerTitle}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]} className="min-h-[44px] justify-center rounded-full border-[#dfe7d9] bg-white px-4 dark:border-[#2a3b30] dark:bg-[#132018]">
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} className="dark:text-[#f3f7f0]">{label}</Text>
    </Pressable>
  )
}

function Avatar({ name, size = 42, photoUri }: { name: string; size?: number; photoUri?: string | null }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {photoUri
        ? <Image source={{ uri: photoUri }} style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]} />
        : <Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.32) }]}>{initials}</Text>}
    </View>
  )
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle} className="text-ink dark:text-[#f3f7f0]">{title}</Text>
      {action && <Pressable onPress={onPress} className="min-h-[44px] justify-center"><Text style={styles.textLink} className="text-ink dark:text-[#d9ff5a]">{action}</Text></Pressable>}
    </View>
  )
}

function ClubCard({ club, miles, joined, onPress }: { club: Club; miles: number; joined: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mb-4 overflow-hidden rounded-[26px] border border-[#E3E6DF] bg-white shadow-lg dark:border-[#2B332D] dark:bg-[#171C19]">
      {club.image ? <><Image source={{ uri: club.image }} style={styles.clubImage} /><View style={styles.clubImageShade} /></> : <View style={[styles.clubImage, styles.clubImageFallback]}><AppIcon name="people-outline" size={34} color="#FF7900" /><Text style={styles.clubImageFallbackText}>{club.category}</Text></View>}
      <View style={styles.categoryBadge} className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5"><Text style={styles.categoryBadgeText} className="tracking-[0.8px]">{club.category.toUpperCase()}</Text></View>
      {joined && <View style={styles.joinedBadge} className="rounded-full border border-accent-300 bg-accent-200 px-2.5 py-1.5"><AppIcon name="checkmark" size={13} /><Text style={styles.joinedBadgeText}>Joined</Text></View>}
      <View className="p-4">
        <Text className="mb-1 text-[19px] font-extrabold text-ink dark:text-[#f3f7f0]">{club.name}</Text>
        <Text className="text-xs leading-[18px] text-slate-500 dark:text-[#9eafa2]" numberOfLines={2}>{club.mission}</Text>
        <View className="mt-3 flex-row justify-between">
          <View className="flex-row items-center gap-1.5"><AppIcon name="people-outline" size={14} color={colors.muted} /><Text className="text-[10px] font-semibold text-slate-500 dark:text-[#9eafa2]">{club.members.toLocaleString()} members</Text></View>
          <View className="flex-row items-center gap-1.5"><AppIcon name="location-outline" size={14} color={colors.muted} /><Text className="text-[10px] font-semibold text-slate-500 dark:text-[#9eafa2]">{miles} mi · {club.zip}</Text></View>
        </View>
      </View>
    </Pressable>
  )
}

function TripCard({ trip, onPress, reserved }: { trip: Trip; onPress: () => void; reserved: boolean }) {
  return (
    <Pressable onPress={onPress} className="mb-2 flex-row items-center gap-3 rounded-[22px] border border-[#dfe7d9] bg-white p-2.5 shadow-sm dark:border-[#2a3b30] dark:bg-[#132018]">
      <Image source={{ uri: trip.image }} style={styles.tripImage} />
      <View style={styles.tripInfo}>
        <View style={styles.tripTopLine}>
          <Text style={styles.eyebrow} className="dark:text-[#9eafa2]">{trip.shortDay.toUpperCase()} · {trip.shortDate}</Text>
          {reserved && <Text style={styles.reservedLabel}>RESERVED</Text>}
        </View>
        <Text style={styles.tripName} className="dark:text-[#f3f7f0]">{trip.title}</Text>
        <Text style={styles.tripMeta} className="dark:text-[#9eafa2]">{trip.time} · {trip.location}</Text>
        <Text style={styles.tripClub} className="dark:text-[#9eafa2]">{trip.club}</Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

function mondayFor(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function tripDateKey(trip: Trip) {
  const explicitDate = trip.eventDate ?? trip.flights?.[0]?.date
  if (explicitDate) {
    const isoDate = explicitDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`
    const usDate = explicitDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (usDate) return `${usDate[3].length === 2 ? `20${usDate[3]}` : usDate[3]}-${usDate[1].padStart(2, '0')}-${usDate[2].padStart(2, '0')}`
  }
  const dateParts = trip.dateLabel.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+(\d{4}))?/)
  if (!dateParts) return null
  const parsed = new Date(`${dateParts[1]} 1, ${dateParts[3] ?? new Date().getFullYear()}`)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`
}

export default function NativeApp() {
  const [fontsLoaded] = useFonts({
    Pacifico_400Regular,
    Exo2_800ExtraBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const { colorScheme, setColorScheme } = useColorScheme()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('feed')
  const [refreshingFeed, setRefreshingFeed] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [feedReloadKey, setFeedReloadKey] = useState(0)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatus>('none')
  const [profileName, setProfileName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [profileBio, setProfileBio] = useState('')
  const [followedHandles, setFollowedHandles] = useState<string[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [notificationsVisible, setNotificationsVisible] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [accountSettingsError, setAccountSettingsError] = useState('')
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [appearancePreference, setAppearancePreference] = useState<AppearancePreference>('system')
  const [appearanceReady, setAppearanceReady] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null)
  const [editAvatarMimeType, setEditAvatarMimeType] = useState('image/jpeg')
  const [avatarChanged, setAvatarChanged] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [searchingPostalCode, setSearchingPostalCode] = useState(false)
  const [loadingNearbyPlaces, setLoadingNearbyPlaces] = useState(false)
  const [locatingClubs, setLocatingClubs] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [postalInput, setPostalInput] = useState('90027')
  const [countryCode, setCountryCode] = useState('US')
  const [locationLabel, setLocationLabel] = useState('Los Angeles, CA')
  const [clubCoordinates, setClubCoordinates] = useState<Coordinates>(areas['90027'])
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [nearbyPlacesError, setNearbyPlacesError] = useState('')
  const [category, setCategory] = useState<'All' | Category>('All')
  const [search, setSearch] = useState('')
  const [joined, setJoined] = useState<string[]>(['club-0'])
  const [scheduleIds, setScheduleIds] = useState(['t1', 't3', 't4', 't6'])
  const [reserved, setReserved] = useState(['t3', 't6'])
  const [posts, setPosts] = useState<Post[]>(seedPosts)
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [selectedManagedClub, setSelectedManagedClub] = useState<ManagedClub | null>(null)
  const [clubBadges, setClubBadges] = useState<Record<string, ClubBadge>>({})
  const [managedClubs, setManagedClubs] = useState<ManagedClub[]>([])
  const [managedMemberships, setManagedMemberships] = useState<Record<string, string>>({})
  const [managedClubUpdates, setManagedClubUpdates] = useState<string[]>([])
  const [clubsLoading, setClubsLoading] = useState(false)
  const [clubsError, setClubsError] = useState('')
  const [clubsReloadKey, setClubsReloadKey] = useState(0)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftLocation, setDraftLocation] = useState('')
  const [draftImage, setDraftImage] = useState<string | undefined>()
  const [commentText, setCommentText] = useState('')
  const [activityStore, setActivityStore] = useState<ActivityStore>({ active: null, history: [], points: 0 })
  const [clock, setClock] = useState(Date.now())

  useEffect(() => {
    let active = true
    const restoreAppearance = async () => {
      try {
        const stored = await AsyncStorage.getItem('fithive.appearance')
        const preference: AppearancePreference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
        if (!active) return
        setAppearancePreference(preference)
        setColorScheme(preference)
      } catch {
        if (active) setColorScheme('system')
      } finally {
        if (active) setAppearanceReady(true)
      }
    }
    void restoreAppearance()
    return () => { active = false }
  }, [setColorScheme])

  const changeAppearance = (preference: AppearancePreference) => {
    setAppearancePreference(preference)
    setColorScheme(preference)
    void AsyncStorage.setItem('fithive.appearance', preference)
  }
  const beginProfileEdit = () => {
    setEditDisplayName(profileName)
    setEditUsername(accountUsername)
    setEditAvatarUri(profileAvatarUrl)
    setEditAvatarMimeType('image/jpeg')
    setAvatarChanged(false)
    setEditBio(profileBio)
    setProfileError('')
    setSettingsVisible(false)
    setEditingProfile(true)
  }
  // NativeWind remains the styling system, while this effective value keeps
  // native children synchronized during immediate appearance changes.
  const isDark = appearancePreference === 'dark' || (appearancePreference === 'system' && colorScheme === 'dark')
  const themeBackground = isDark ? theme.colors.dark : theme.colors.paper
  const themeSurface = isDark ? theme.colors.darkSurface : '#FFFFFF'
  const themeText = isDark ? theme.colors.darkText : theme.colors.ink
  const themeMuted = isDark ? theme.colors.darkMuted : theme.colors.muted
  const themeBorder = isDark ? theme.colors.darkBorder : theme.colors.line
  const dark = isDark
  const foreground = themeText
  const settingsSurface = { backgroundColor: themeSurface, borderColor: themeBorder }
  const [importedWorkouts, setImportedWorkouts] = useState<ImportedWorkout[]>([])
  const [healthProvider, setHealthProvider] = useState<string | null>(null)
  const [syncingHealth, setSyncingHealth] = useState(false)
  const [dailyFitnessMetrics, setDailyFitnessMetrics] = useState<DailyFitnessMetrics | null>(null)
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => new Date())
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0)
  const [flightNumber, setFlightNumber] = useState('')
  const [flightStatus, setFlightStatus] = useState<FlightStatus | null>(null)
  const [flightLookupError, setFlightLookupError] = useState('')
  const [lookingUpFlight, setLookingUpFlight] = useState(false)

  useEffect(() => {
    if (!supabaseClient) {
      setAuthLoading(false)
      return
    }
    let active = true
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (nextSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) setTab('feed')
      setAuthLoading(false)
    })
    supabaseClient.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (active) {
          setSession(data.session)
          setAuthLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setAuthLoading(false)
        Alert.alert('Unable to restore your account', error instanceof Error ? error.message : 'Sign in again to continue.')
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !session?.user.id) {
      setOwnerStatus('none')
      setProfileName(session?.user.user_metadata?.display_name ?? '')
      setProfileUsername(session?.user.user_metadata?.username ?? '')
      setProfileAvatarUrl(session?.user.user_metadata?.avatar_url ?? null)
      setProfileBio(session?.user.user_metadata?.bio ?? '')
      setAccountSettingsError('')
      return
    }
    let active = true
    const loadProfile = async () => {
      const { data, error: profileError } = await client.from('profiles')
        .select('display_name,username,owner_status').eq('id', session.user.id).maybeSingle()
      if (profileError) throw profileError
      let bio = session.user.user_metadata?.bio ?? ''
      let avatarUrl = session.user.user_metadata?.avatar_url ?? null
      const { data: profileDetails, error: bioError } = await client.from('profiles')
        .select('bio,avatar_url').eq('id', session.user.id).maybeSingle()
      if (bioError && !['42703', 'PGRST204', 'PGRST200'].includes(bioError.code ?? '')) throw bioError
      if (!bioError) {
        bio = profileDetails?.bio ?? bio
        avatarUrl = profileDetails?.avatar_url ?? null
      }
      if (active) {
        setProfileName(data?.display_name ?? session.user.user_metadata?.display_name ?? '')
        setProfileUsername(data?.username ?? session.user.user_metadata?.username ?? '')
        setProfileAvatarUrl(avatarUrl)
        setProfileBio(bio)
        setOwnerStatus(data?.owner_status === 'verified' || data?.owner_status === 'pending' ? data.owner_status : 'none')
        setAccountSettingsError(bioError
          ? 'Your account loaded, but profile editing needs the profile migrations applied in Supabase (202611050002_profile_bio.sql, 202611050003_usernames.sql, and 202611050004_profile_photos.sql).'
          : '')
      }
      if (data?.owner_status === 'pending') {
        const { error: verifyError } = await client.rpc('verify_pending_club_owner_email')
        if (verifyError) {
          if (active) setAccountSettingsError(`Owner status could not be refreshed: ${verifyError.message}`)
          return
        }
        if (active) {
          const { data: refreshed, error: refreshError } = await client.from('profiles')
            .select('owner_status').eq('id', session.user.id).maybeSingle()
          if (refreshError) throw refreshError
          setOwnerStatus(refreshed?.owner_status === 'verified' ? 'verified' : 'pending')
        }
      }
    }
    loadProfile().catch((error: unknown) => {
      if (active) {
        const details = error instanceof Error ? error.message : 'Please try again.'
        setAccountSettingsError(`Account settings could not load from Supabase: ${details} Check that the account, profile, username, and profile photo migrations have been applied.`)
      }
    })
    return () => { active = false }
  }, [session?.user.id])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !session?.user.id) {
      setFollowedHandles([])
      setFollowersCount(0)
      setFollowingCount(0)
      return
    }
    let active = true
    const socialUsername = (profileUsername || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'fithive')
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'fithive'
    const loadSocialGraph = async () => {
      const [{ data: followingRows, error: followingError }, { count, error: followersError }] = await Promise.all([
        client.from('user_follows').select('following_username').eq('follower_id', session.user.id),
        client.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_username', socialUsername),
      ])
      if (followingError) throw followingError
      if (followersError) throw followersError
      if (!active) return
      setFollowedHandles((followingRows ?? []).map((row) => row.following_username))
      setFollowingCount(followingRows?.length ?? 0)
      setFollowersCount(count ?? 0)
    }
    loadSocialGraph().catch((error: unknown) => {
      if (active) setAccountSettingsError(`Social connections could not load: ${error instanceof Error ? error.message : 'Apply the social follows migration in Supabase.'}`)
    })
    return () => { active = false }
  }, [session?.user.id, profileUsername, session?.user.user_metadata?.username, session?.user.email])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !session?.user.id || Platform.OS === 'web') return
    const registerPushNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }
      const current = await Notifications.getPermissionsAsync()
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync()
      if (permission.status !== 'granted') return
      const token = (await Notifications.getExpoPushTokenAsync()).data
      const { error } = await client.from('push_tokens').upsert({
        user_id: session.user.id,
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'expo_push_token' })
      if (error) throw error
    }
    registerPushNotifications().catch(() => {
      // Push registration is optional; the in-app notification center still works.
    })
  }, [session?.user.id])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !session?.user.id) {
      setPosts(seedPosts)
      setFeedLoading(false)
      setFeedError('')
      return
    }
    let active = true
    setFeedLoading(true)
    setFeedError('')
    const loadCommunityPosts = async () => {
      const { data, error } = await client.from('community_posts')
        .select('id,author_id,body,image_url,location,club,created_at,profiles!community_posts_author_id_fkey(display_name,username,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) {
        if (['PGRST205', '42P01'].includes(error.code ?? '')) return
        throw error
      }
      if (!active) return
      const remotePosts: Post[] = (data ?? []).flatMap((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const handle = profile?.username
        if (!handle) return []
        return [{
          id: `remote-${row.id}`,
          authorId: row.author_id,
          author: profile.display_name || handle,
          handle,
          avatarUrl: profile.avatar_url,
          mine: row.author_id === session.user.id,
          text: row.body,
          image: row.image_url ?? undefined,
          location: row.location ?? undefined,
          club: row.club ?? undefined,
          time: new Date(row.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          likes: 0,
          comments: [],
          liked: false,
          saved: false,
        }]
      })
      setPosts([...remotePosts, ...seedPosts])
    }
    loadCommunityPosts().catch((error: unknown) => {
      if (active) setFeedError(error instanceof Error ? error.message : 'Unable to refresh community posts.')
    }).finally(() => {
      if (active) {
        setFeedLoading(false)
        setRefreshingFeed(false)
      }
    })
    return () => { active = false }
  }, [session?.user.id, feedReloadKey])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !session?.user.id || (tab !== 'home' && tab !== 'owner')) {
      if (!session?.user.id) setManagedClubs([])
      return
    }
    let active = true
    const loadManagedClubs = async () => {
      setClubsLoading(true)
      setClubsError('')
      const { data: clubRows, error: clubsError } = await client.from('clubs')
        .select('id,owner_id,name,description,activity,location').order('created_at', { ascending: false })
      if (clubsError) throw clubsError
      if (active) setManagedClubs((clubRows ?? []) as ManagedClub[])
      const { data: memberships, error: membershipsError } = await client.from('club_memberships')
        .select('club_id,status').eq('member_id', session.user.id)
      if (membershipsError) throw membershipsError
      if (active) {
        setManagedMemberships(Object.fromEntries((memberships ?? []).map((membership) => [membership.club_id, membership.status])))
      }
    }
    loadManagedClubs().catch((error: unknown) => {
      if (active) setClubsError(error instanceof Error ? error.message : 'Please try again.')
    }).finally(() => {
      if (active) setClubsLoading(false)
    })
    return () => { active = false }
  }, [session?.user.id, tab, clubsReloadKey])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !selectedManagedClub) {
      setManagedClubUpdates([])
      return
    }
    let active = true
    const loadUpdates = async () => {
      try {
        const { data, error } = await client.from('club_updates').select('body')
          .eq('club_id', selectedManagedClub.id).order('created_at', { ascending: false }).limit(20)
        if (error) throw error
        if (active) setManagedClubUpdates((data ?? []).map((update) => update.body))
      } catch (error) {
        if (active) Alert.alert('Unable to load club updates', error instanceof Error ? error.message : 'Please try again.')
      }
    }
    void loadUpdates()
    return () => { active = false }
  }, [selectedManagedClub?.id])

  useEffect(() => {
    setActivityUserId(session?.user.id ?? null)
    setHealthUserId(session?.user.id ?? null)
    if (!session?.user.id) {
      setActivityStore({ active: null, history: [], points: 0 })
      setImportedWorkouts([])
      setHealthProvider(null)
      setDailyFitnessMetrics(null)
      setManagedClubs([])
      setManagedMemberships({})
      setSelectedManagedClub(null)
      setManagedClubUpdates([])
      setTab('home')
      return
    }
    Promise.all([getActivityStore(), loadImportedWorkouts(), loadHealthProvider(), loadDailyFitnessMetrics()])
      .then(([savedActivities, savedWorkouts, savedProvider, savedMetrics]) => {
        setActivityStore(savedActivities)
        setImportedWorkouts(savedWorkouts)
        setHealthProvider(savedProvider)
        setDailyFitnessMetrics(savedMetrics)
      })
      .catch((error: unknown) => {
        Alert.alert('Unable to load activity data', error instanceof Error ? error.message : 'Please restart the app and try again.')
      })
  }, [session?.user.id])

  useEffect(() => {
    if (!activityStore.active) return
    const timer = setInterval(() => {
      setClock(Date.now())
      getActivityStore()
        .then(setActivityStore)
        .catch((error: unknown) => {
          Alert.alert('Activity update failed', error instanceof Error ? error.message : 'The activity could not be refreshed.')
        })
    }, 3000)
    return () => clearInterval(timer)
  }, [activityStore.active?.id])

  const accountUsername = (profileUsername || session?.user.user_metadata?.username || session?.user.email?.split('@')[0] || 'fithive')
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20) || 'fithive'
  const accountHandle = `@${accountUsername}`
  const selectedClubCountry = clubCountries.find(({ code }) => code === countryCode) ?? clubCountries[0]
  const visibleClubs = useMemo(
    () => clubs
      .map((club) => ({ club, miles: distanceBetweenCoordinates(clubCoordinates, areas[club.zip]) }))
      .filter(({ miles }) => miles <= 50)
      .filter(({ club }) => category === 'All' || club.category === category)
      .filter(({ club }) => club.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.miles - b.miles),
    [clubCoordinates, category, search],
  )
  const scheduleTrips = scheduleIds.map((id) => tripById(id)).filter((trip): trip is Trip => !!trip)
  const scheduleWeekStart = mondayFor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + scheduleWeekOffset * 7))
  const scheduleWeek = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(scheduleWeekStart)
    date.setDate(scheduleWeekStart.getDate() + index)
    return date
  })
  const selectedDayTrips = scheduleTrips.filter((trip) => tripDateKey(trip) === dateKey(selectedScheduleDate))
  const moveScheduleWeek = (amount: number) => {
    setScheduleWeekOffset((offset) => offset + amount)
    setSelectedScheduleDate((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }
  const commentsPost = posts.find((post) => post.id === commentsPostId) ?? null
  const myPosts = posts.filter((post) => post.mine)
  const activeDuration = activityStore.active
    ? activityStore.active.elapsedSeconds + (
      activityStore.active.status === 'recording'
        ? Math.max(0, Math.floor((clock - (activityStore.active.segmentStartedAt ?? clock)) / 1000))
        : 0
    )
    : 0

  const ringMetricsForDate = (date: Date): FitnessRingValues => {
    const isToday = dateKey(date) === dateKey(new Date())
    if (isToday && dailyFitnessMetrics) {
      return {
        move: dailyFitnessMetrics.moveCalories,
        exercise: dailyFitnessMetrics.exerciseMinutes,
        stand: dailyFitnessMetrics.standHours,
      }
    }

    const completed = activityStore.history.filter(
      (activity) => dateKey(new Date(activity.endedAt ?? activity.startedAt)) === dateKey(date),
    )
    const exercise = completed.reduce((total, activity) => total + activity.elapsedSeconds / 60, 0)
    const move = completed.reduce(
      (total, activity) => total + (activity.distanceMeters > 0 ? activity.distanceMeters * 0.06 : activity.elapsedSeconds / 60 * 6),
      0,
    )
    const stand = Math.min(12, completed.length + Math.floor(exercise / 45))
    return { move, exercise, stand }
  }

  const runActivityAction = async (action: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    try {
      const completed = await action()
      setActivityStore(await getActivityStore())
      if (completed && typeof completed === 'object' && 'earnedPoints' in completed) {
        Alert.alert('Activity complete!', `You earned ${(completed as { earnedPoints: number }).earnedPoints} points. Great work!`)
      } else if (successMessage) {
        Alert.alert('Activity tracker', successMessage)
      }
      return true
    } catch (error) {
      Alert.alert('Activity tracker', error instanceof Error ? error.message : 'The activity could not be updated.')
      return false
    }
  }

  const connectHealthProvider = async () => {
    setSyncingHealth(true)
    try {
      const workouts = await syncHealthWorkouts()
      const provider = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'
      setImportedWorkouts(workouts)
      setHealthProvider(provider)
      await saveHealthProvider(provider)
      try {
        const metrics = await syncDailyFitnessMetrics()
        setDailyFitnessMetrics(metrics)
        Alert.alert('Fitness data synced', `Imported ${workouts.length} workouts and updated today's movement rings from ${provider}.`)
      } catch (error) {
        Alert.alert(
          'Fitness app connected',
          `Imported ${workouts.length} workouts from ${provider}, but today's movement rings could not sync: ${error instanceof Error ? error.message : 'Check health permissions and try again.'}`,
        )
      }
    } catch (error) {
      Alert.alert('Could not connect fitness data', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSyncingHealth(false)
    }
  }

  const disconnectHealthProvider = async () => {
    try {
      await saveHealthProvider(null)
      setHealthProvider(null)
      setDailyFitnessMetrics(null)
    } catch (error) {
      Alert.alert('Could not disconnect', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const lookupFlight = async () => {
    if (!supabaseClient || !flightNumber.trim()) return
    setLookingUpFlight(true)
    setFlightLookupError('')
    setFlightStatus(null)
    try {
      const { data, error } = await supabaseClient.functions.invoke<FlightStatus>('flight-status', {
        body: { flightNumber: flightNumber.trim(), flightDate: selectedTrip ? tripDateKey(selectedTrip) : undefined },
      })
      if (error) throw error
      if (!data) throw new Error('No flight information was returned.')
      setFlightStatus(data)
    } catch (error) {
      setFlightLookupError(error instanceof Error
        ? error.message
        : 'Flight status is unavailable. Check that the Aviationstack function is deployed and configured.')
    } finally {
      setLookingUpFlight(false)
    }
  }

  const refreshOwnerStatus = async () => {
    if (!supabaseClient || !session?.user.id) return
    let { data, error } = await supabaseClient.from('profiles')
      .select('display_name,username,owner_status').eq('id', session.user.id).maybeSingle()
    if (error) throw error
    if (data?.owner_status === 'pending') {
      const { error: verifyError } = await supabaseClient.rpc('verify_pending_club_owner_email')
      if (verifyError) throw verifyError
      const refreshed = await supabaseClient.from('profiles')
        .select('display_name,username,owner_status').eq('id', session.user.id).maybeSingle()
      if (refreshed.error) throw refreshed.error
      data = refreshed.data
    }
    setProfileName(data?.display_name ?? '')
    setProfileUsername(data?.username ?? '')
    const { data: bioData, error: bioError } = await supabaseClient.from('profiles')
      .select('bio').eq('id', session.user.id).maybeSingle()
    if (bioError && !['42703', 'PGRST204', 'PGRST200'].includes(bioError.code ?? '')) throw bioError
    setProfileBio(bioData?.bio ?? session.user.user_metadata?.bio ?? '')
    setOwnerStatus(data?.owner_status === 'verified' || data?.owner_status === 'pending' ? data.owner_status : 'none')
  }

  const searchByPostalCode = async () => {
    const postalCode = postalInput.trim()
    const country = countryCode.trim().toUpperCase()
    if (!clubCountries.some(({ code }) => code === country) || !/^[\p{L}\d][\p{L}\d -]{0,11}$/u.test(postalCode)) {
      Alert.alert('Check your location', 'Choose the United States, Canada, or United Kingdom and enter a valid postal code.')
      return
    }
    setSearchingPostalCode(true)
    try {
      const location = await lookupPostalLocation(country, postalCode)
      const coordinates = { latitude: location.latitude, longitude: location.longitude }
      setClubCoordinates(coordinates)
      setCountryCode(location.country)
      setLocationLabel([location.city, location.region, location.country].filter(Boolean).join(', '))
      setCategory('All')
      setNearbyPlacesError('')
      setNearbyPlaces([])
      setLoadingNearbyPlaces(true)
      setSearchingPostalCode(false)
      try {
        setNearbyPlaces(await fetchNearbyPlaces(coordinates))
      } catch (error) {
        setNearbyPlacesError(error instanceof Error ? error.message : 'Nearby places could not be loaded.')
      } finally {
        setLoadingNearbyPlaces(false)
      }
    } catch (error) {
      Alert.alert('Unable to find nearby activities', error instanceof Error ? error.message : 'Check your connection and try again.')
    } finally {
      setSearchingPostalCode(false)
    }
  }

  const locateNearbyActivities = async () => {
    setLocatingClubs(true)
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        throw new Error('Turn on Location Services in your device settings, then try again.')
      }
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        throw new Error('Allow location access in your device settings to find nearby activities.')
      }
      // A device can have permission while still having no cached GPS fix. Treat
      // the cache as optional, then request a quick coarse fix for nearby clubs.
      // This is more reliable indoors and avoids failing before the live request.
      let lastKnown: Location.LocationObject | null = null
      try {
        lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 15 * 60 * 1000,
          requiredAccuracy: 2500,
        })
      } catch {
        // Some iOS/Expo Go builds throw when no cached location exists.
      }
      const position = lastKnown ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      let place: Location.LocationGeocodedAddress | null = null
      try {
        [place] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      } catch {
        // Coordinates are enough to load nearby places; reverse geocoding is only for the label.
      }
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      setClubCoordinates(coordinates)
      const detectedCountry = clubCountries.find(({ code }) => code === place?.isoCountryCode?.toUpperCase())
      if (detectedCountry) {
        setCountryCode(detectedCountry.code)
        if (place?.postalCode) setPostalInput(place.postalCode)
      }
      setLocationLabel(place ? [place.city ?? place.subregion ?? 'Near me', place.region, place.isoCountryCode].filter(Boolean).join(', ') : 'Near me')
      setCategory('All')
      setNearbyPlacesError('')
      setNearbyPlaces([])
      setLoadingNearbyPlaces(true)
      try {
        setNearbyPlaces(await fetchNearbyPlaces(coordinates))
      } catch (error) {
        setNearbyPlacesError(error instanceof Error ? error.message : 'Nearby places could not be loaded.')
      } finally {
        setLoadingNearbyPlaces(false)
      }
    } catch (error) {
      Alert.alert('Unable to find your location', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLocatingClubs(false)
    }
  }

  const findNearbyActivities = () => {
    Alert.alert(
      'Find activities near you',
      'FitHive will use your current location once to look for nearby parks, trails, sports areas, and fitness places. Your location is not saved.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => { void locateNearbyActivities() } },
      ],
    )
  }

  const openNearbyPlace = async (place: NearbyPlace) => {
    const url = Platform.OS === 'ios'
      ? `https://maps.apple.com/?ll=${place.coordinates.latitude},${place.coordinates.longitude}&q=${encodeURIComponent(place.name)}`
      : `geo:${place.coordinates.latitude},${place.coordinates.longitude}?q=${encodeURIComponent(place.name)}`
    try {
      await Linking.openURL(url)
    } catch (error) {
      Alert.alert('Unable to open map', error instanceof Error ? error.message : 'Try opening your maps app and searching for this place.')
    }
  }

  const confirmPhotoPermission = async (source: 'camera' | 'library') => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        source === 'camera' ? 'Allow camera access?' : 'Allow photo access?',
        source === 'camera'
          ? 'FitHive will ask your device for camera permission so you can take a profile photo.'
          : 'FitHive will ask your device for photo access so you can choose a profile photo.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
      )
    })
    if (!confirmed) return false

    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (permission.granted) return true

    Alert.alert(
      'Permission needed',
      source === 'camera'
        ? 'Allow camera access in device settings to take a photo.'
        : 'Allow photo access in device settings to choose a photo.',
      permission.canAskAgain
        ? [{ text: 'OK' }]
        : [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => { void Linking.openSettings() } },
          ],
    )
    return false
  }

  const pickProfilePhoto = async (source: 'camera' | 'library') => {
    try {
      if (!await confirmPhotoPermission(source)) return
      const options = {
        mediaTypes: ['images'] as ('images')[],
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
      if (!result.canceled && result.assets[0]?.uri) {
        const mimeType = result.assets[0].mimeType
        setEditAvatarMimeType(mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
          ? mimeType
          : 'image/jpeg')
        setEditAvatarUri(result.assets[0].uri)
        setAvatarChanged(true)
      }
    } catch (error) {
      Alert.alert('Unable to select profile photo', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const saveProfile = async () => {
    if (!supabaseClient || !session?.user.id) return
    const displayName = editDisplayName.trim()
    const username = editUsername.trim().replace(/^@/, '').toLowerCase()
    const bio = editBio.trim()
    if (!displayName) {
      setProfileError('Add a display name before saving.')
      return
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setProfileError('Choose a username with 3–20 letters, numbers, or underscores.')
      return
    }
    setSavingProfile(true)
    setProfileError('')
    let uploadedAvatarPath: string | null = null
    try {
      let avatarUrl = profileAvatarUrl
      if (avatarChanged && editAvatarUri) {
        const photoResponse = await fetch(editAvatarUri)
        if (!photoResponse.ok) throw new Error('Could not read the selected photo. Choose it again and retry.')
        const photo = new ExpoBlob([await photoResponse.arrayBuffer()], { type: editAvatarMimeType })
        if (photo.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.')
        const extension = editAvatarMimeType === 'image/png' ? 'png' : editAvatarMimeType === 'image/webp' ? 'webp' : 'jpg'
        const newAvatarPath = `${session.user.id}/avatar-${Date.now()}.${extension}`
        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(newAvatarPath, photo, {
          contentType: editAvatarMimeType,
          upsert: false,
        })
        if (uploadError) throw new Error(`Could not upload profile photo: ${uploadError.message}. Apply the profile photo migration and try again.`)
        uploadedAvatarPath = newAvatarPath
        avatarUrl = supabaseClient.storage.from('avatars').getPublicUrl(newAvatarPath).data.publicUrl
      } else if (avatarChanged) {
        avatarUrl = null
      }
      const { data, error } = await supabaseClient.from('profiles')
        .update({ display_name: displayName, username, bio, avatar_url: avatarUrl }).eq('id', session.user.id).select('id').maybeSingle()
      if (error) {
        const message = error.code === '23505'
          ? 'That username is already taken. Choose another one.'
          : `${error.message} Confirm that 202611050002_profile_bio.sql, 202611050003_usernames.sql, and 202611050004_profile_photos.sql have been applied in Supabase and that profile update permissions are enabled.`
        throw new Error(message)
      }
      if (!data) {
        throw new Error('Your profile row was not found. Apply the account migration in Supabase, then sign out and back in.')
      }
      uploadedAvatarPath = null
      setProfileName(displayName)
      setProfileUsername(username)
      setProfileAvatarUrl(avatarUrl)
      setProfileBio(bio)
      setEditingProfile(false)
      setSettingsVisible(false)
      if (avatarChanged && profileAvatarUrl) {
        const oldObjectPath = profileAvatarUrl.split('/storage/v1/object/public/avatars/')[1]
        if (oldObjectPath) {
          const { error: removeError } = await supabaseClient.storage.from('avatars').remove([decodeURIComponent(oldObjectPath)])
          if (removeError) Alert.alert('Profile saved', `Your profile photo was updated, but the previous photo could not be removed: ${removeError.message}`)
        }
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Could not save your profile.'
      if (uploadedAvatarPath) {
        const { error: cleanupError } = await supabaseClient.storage.from('avatars').remove([uploadedAvatarPath])
        if (cleanupError) message += ` The unused uploaded photo could not be removed: ${cleanupError.message}`
      }
      setProfileError(message)
    } finally {
      setSavingProfile(false)
    }
  }

  const signOut = async () => {
    if (!supabaseClient) return
    try {
      const activity = await getActivityStore()
      if (activity.active) {
        Alert.alert('Finish your activity first', 'Pause or finish your activity before signing out so your route and session stay associated with your account.')
        return
      }
    } catch (error) {
      Alert.alert('Could not check activity status', error instanceof Error ? error.message : 'Try again before signing out.')
      return
    }
    const { error } = await supabaseClient.auth.signOut()
    if (error) Alert.alert('Could not sign out', error.message)
  }

  const toggleJoin = (id: string) => {
    setJoined((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const requestManagedClubMembership = async () => {
    if (!supabaseClient || !session || !selectedManagedClub) return
    try {
      const { error } = await supabaseClient.from('club_memberships').insert({
        club_id: selectedManagedClub.id,
        member_id: session.user.id,
        status: 'pending',
      })
      if (error) throw error
      setManagedMemberships((current) => ({ ...current, [selectedManagedClub.id]: 'pending' }))
    } catch (error) {
      Alert.alert('Could not request to join', error instanceof Error ? error.message : 'Please try again.')
    }
  }
  const toggleSchedule = (trip: Trip) => {
    setScheduleIds((current) => current.includes(trip.id) ? current.filter((id) => id !== trip.id) : [...current, trip.id])
  }
  const openTrip = (trip: Trip) => {
    setFlightNumber(trip.flights?.[0]?.flightNo ?? '')
    setFlightStatus(null)
    setFlightLookupError('')
    setSelectedTrip(trip)
  }
  const toggleLike = (postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
      : post))
  }
  const toggleSave = (postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, saved: !post.saved } : post))
  }
  const toggleFollow = async (handle: string) => {
    const client = supabaseClient
    if (!client || !session?.user.id) return
    const normalizedHandle = handle.replace(/^@/, '').toLowerCase()
    const wasFollowing = followedHandles.includes(normalizedHandle)
    setFollowedHandles((current) => wasFollowing ? current.filter((item) => item !== normalizedHandle) : [...current, normalizedHandle])
    setFollowingCount((current) => Math.max(0, current + (wasFollowing ? -1 : 1)))
    try {
      if (wasFollowing) {
        const { error } = await client.from('user_follows').delete().eq('follower_id', session.user.id).eq('following_username', normalizedHandle)
        if (error) throw error
      } else {
        const { error } = await client.from('user_follows').insert({ follower_id: session.user.id, following_username: normalizedHandle })
        if (error) throw error
      }
    } catch (error) {
      setFollowedHandles((current) => wasFollowing ? [...current, normalizedHandle] : current.filter((item) => item !== normalizedHandle))
      setFollowingCount((current) => Math.max(0, current + (wasFollowing ? 1 : -1)))
      Alert.alert('Could not update follow', error instanceof Error ? error.message : 'Apply the social follows migration in Supabase, then try again.')
    }
  }
  const loadNotifications = async () => {
    if (!supabaseClient || !session?.user.id) return
    const { data, error } = await supabaseClient.from('notifications')
      .select('id,type,title,body,created_at,read_at')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) {
      if (['PGRST205', '42P01'].includes(error.code ?? '')) return
      throw error
    }
    setNotifications((data ?? []) as AppNotification[])
  }
  const openNotifications = () => {
    setNotificationsVisible(true)
    void loadNotifications().catch((error: unknown) => Alert.alert('Unable to load notifications', error instanceof Error ? error.message : 'Please try again.'))
  }
  const markNotificationRead = async (notification: AppNotification) => {
    if (notification.read_at || !supabaseClient) return
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item))
    await supabaseClient.from('notifications').update({ read_at: readAt }).eq('id', notification.id)
  }
  const addComment = () => {
    const text = commentText.trim()
    if (!text || !commentsPostId) return
    setPosts((current) => current.map((post) => post.id === commentsPostId
      ? { ...post, comments: [...post.comments, { id: `comment-${Date.now()}`, author: accountUsername, handle: accountUsername, mine: true, text, time: 'Just now', likes: 0, liked: false }] }
      : post))
    setCommentText('')
  }
  const closeComposer = () => {
    setComposing(false)
    setDraftText('')
    setDraftLocation('')
    setDraftImage(undefined)
  }
  const submitPost = async () => {
    if (!draftText.trim() && !draftImage) return
    const post: Post = {
      id: `post-${Date.now()}`,
      authorId: session?.user.id,
      author: accountUsername,
      handle: accountUsername,
      mine: true,
      text: draftText.trim(),
      image: draftImage,
      location: draftLocation.trim() || undefined,
      time: 'Just now',
      likes: 0,
      comments: [],
      liked: false,
      saved: false,
    }
    setPosts((current) => [post, ...current])
    if (supabaseClient && session?.user.id && draftText.trim()) {
      const { error } = await supabaseClient.from('community_posts').insert({
        author_id: session.user.id,
        body: draftText.trim(),
        image_url: null,
        location: draftLocation.trim() || null,
      })
      if (error && !['PGRST205', '42P01'].includes(error.code ?? '')) {
        Alert.alert('Post saved on this device', `It could not be shared with other accounts yet: ${error.message}`)
      }
    }
    closeComposer()
    setTab('feed')
  }
  const pickImage = async (source: 'camera' | 'library') => {
    try {
      if (!await confirmPhotoPermission(source)) return
      const options = {
        mediaTypes: ['images'] as ('images')[],
        allowsEditing: true,
        quality: 0.85,
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
      if (!result.canceled) setDraftImage(result.assets[0]?.uri)
    } catch (error) {
      Alert.alert('Unable to open photos', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const badgeForClub = (clubId: string, index = 0): ClubBadge => clubBadges[clubId] ?? { type: 'icon', value: badgeOptions[index % badgeOptions.length] }

  const importClubBadge = async (clubId: string) => {
    try {
      if (!await confirmPhotoPermission('library')) return
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as ('images')[],
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.85,
      })
      if (!result.canceled && result.assets[0]?.uri) {
        setClubBadges((current) => ({ ...current, [clubId]: { type: 'image', value: result.assets[0].uri } }))
      }
    } catch (error) {
      Alert.alert('Unable to select badge', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const legacyRenderHome = () => (
    <ScrollView className="flex-1 bg-[#e9eee4] dark:bg-[#07110d]" contentContainerStyle={styles.screenContent} contentContainerClassName="px-[18px] pb-8 pt-5" keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Find your people." action={
        <Pressable className="h-11 w-11 items-center justify-center rounded-full border-2 border-accent-200 bg-white p-0.5 shadow-md dark:bg-[#132018]" onPress={() => setTab('profile')} accessibilityLabel="Open profile">
          <Avatar name={accountUsername} size={36} photoUri={profileAvatarUrl} />
        </Pressable>
      } />
      <View className="mb-3 h-[52px] flex-row items-center gap-2 rounded-[20px] border border-[#dfe7d9] bg-white px-3 shadow-md dark:border-[#2a3b30] dark:bg-[#132018]">
        <AppIcon name="search-outline" color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search clubs" placeholderTextColor={colors.muted} style={styles.searchInput} className="text-ink dark:text-[#f3f7f0]" returnKeyType="search" />
      </View>
      <View style={styles.zipRow}>
        <Pressable
          style={[styles.zipInputBox, styles.countryCodeBox]}
          className="rounded-[16px] border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]"
          onPress={() => Alert.alert('Choose a country', 'Club search is available in these countries.', clubCountries.map(({ code, label }) => ({
            text: label,
            onPress: () => setCountryCode(code),
          })))}
          accessibilityRole="button"
          accessibilityLabel={`Country: ${selectedClubCountry.label}. Choose country`}
        >
          <Text style={styles.countryCodeInput} className="text-ink dark:text-[#f3f7f0]" numberOfLines={1}>{selectedClubCountry.label}</Text>
          <AppIcon name="chevron-down" color={colors.muted} size={14} />
        </Pressable>
        <View style={styles.zipInputBox} className="rounded-[16px] border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]">
          <AppIcon name="location-outline" color={colors.muted} />
          <TextInput
            value={postalInput}
            onChangeText={setPostalInput}
            placeholder="Postal code"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={12}
            style={styles.zipInput}
            className="text-ink dark:text-[#f3f7f0]"
            accessibilityLabel="Postal code"
          />
        </View>
        <Pressable className="min-h-[46px] min-w-[82px] items-center justify-center rounded-[16px] bg-ink px-4 shadow-sm" onPress={() => {
          void searchByPostalCode()
        }} disabled={searchingPostalCode}>
          <Text style={styles.searchButtonText}>{searchingPostalCode ? 'Looking up…' : 'Update'}</Text>
        </Pressable>
      </View>
      <Pressable className="mb-4 min-h-[46px] flex-row items-center justify-center gap-2 rounded-[16px] border border-[#dfe7d9] bg-white shadow-sm dark:border-[#2a3b30] dark:bg-[#132018]" onPress={findNearbyActivities} disabled={locatingClubs}>
        <AppIcon name="navigate-outline" color={colors.blue} />
        <Text style={styles.nearMeText}>{locatingClubs ? 'Finding your location…' : 'Find activities near me'}</Text>
      </Pressable>
      <View className="mb-4 flex-row items-center gap-2 rounded-[18px] border border-accent-200 bg-[#f0f7d0] px-3.5 py-3.5 shadow-sm dark:border-[#4b6138] dark:bg-[#16281c]">
        <AppIcon name="navigate-outline" color={colors.ink} />
        <Text style={styles.locationBannerText}>{locationLabel}<Text style={styles.mutedText}> · {nearbyPlaces.length} places found</Text></Text>
      </View>
      <SectionTitle title={`Clubs near ${locationLabel}`} />
      <Text style={styles.nearbyAttribution}>Find nearby groups for running, hiking, cycling, wellness, and more.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
        {categories.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>
      {visibleClubs.map(({ club, miles }) => (
        <ClubCard key={club.id} club={club} miles={miles} joined={joined.includes(club.id)} onPress={() => setSelectedClub(club)} />
      ))}
      {!visibleClubs.length && <Text style={styles.emptyText}>No clubs within 50 miles match this activity. Try another postal code or category.</Text>}
      <SectionTitle title={`Places to move near ${locationLabel}`} />
      <Text style={styles.nearbyAttribution}>Parks, trails, sports areas, and fitness places · Map data © OpenStreetMap contributors.</Text>
      {loadingNearbyPlaces && <Text style={styles.simpleRowSub}>Looking for places nearby…</Text>}
      {!!nearbyPlacesError && <Text accessibilityRole="alert" style={styles.errorText}>{nearbyPlacesError}</Text>}
      {!loadingNearbyPlaces && !nearbyPlacesError && nearbyPlaces.length === 0 && (
        <Text style={styles.emptyText}>No mapped activity spots found nearby yet. Try another postal code or use Find activities near me.</Text>
      )}
      {nearbyPlaces.slice(0, 12).map((place) => (
        <Pressable key={place.id} style={styles.nearbyPlaceCard} className="rounded-[20px] border-[#dfe7d9] bg-white shadow-sm dark:border-[#2a3b30] dark:bg-[#132018]" onPress={() => { void openNearbyPlace(place) }}>
          <View style={styles.nearbyPlaceIcon}><AppIcon name="fitness-outline" color={colors.ink} /></View>
          <View style={styles.nearbyPlaceCopy}>
            <Text style={styles.nearbyPlaceName} className="dark:text-[#f3f7f0]">{place.name}</Text>
            <Text style={styles.simpleRowSub} className="dark:text-[#9eafa2]">{place.kind} · {place.miles.toFixed(1)} mi away</Text>
            <Text style={styles.nearbyPlaceActivities} className="dark:text-[#9eafa2]">{place.activities.join(' · ')}</Text>
          </View>
          <AppIcon name="open-outline" color={colors.muted} size={17} />
        </Pressable>
      ))}
      {!!managedClubs.length && <SectionTitle title="Community clubs" />}
      {managedClubs.map((club) => (
        <Pressable key={club.id} style={styles.simpleRow} className="rounded-[20px] border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]" onPress={() => setSelectedManagedClub(club)}>
          <Avatar name={club.name} size={42} />
          <View style={styles.simpleRowCopy}>
            <Text style={styles.simpleRowTitle} className="dark:text-[#f3f7f0]">{club.name}</Text>
            <Text style={styles.simpleRowSub} className="dark:text-[#9eafa2]">{[club.activity, club.location].filter(Boolean).join(' · ') || 'Community club'}</Text>
          </View>
          <AppIcon name="chevron-forward" color={colors.muted} />
        </Pressable>
      ))}
      {clubsLoading && <Text style={styles.simpleRowSub}>Loading community club pages…</Text>}
      {!!clubsError && (
        <View style={styles.clubLoadError}>
          <Text style={styles.clubLoadErrorTitle}>Couldn’t load all club data</Text>
          <Text style={styles.clubLoadErrorText}>{clubsError}</Text>
          <Pressable onPress={() => setClubsReloadKey((key) => key + 1)} style={styles.clubRetryButton}>
            <Text style={styles.clubRetryText}>Try again</Text>
          </Pressable>
        </View>
      )}
      {!clubsLoading && !clubsError && managedClubs.length === 0 && (
        <View style={styles.clubEmptyCard}>
          <Text style={styles.clubEmptyTitle}>Your account is ready for clubs</Text>
          <Text style={styles.clubEmptyText}>Signing up creates your member profile, but not a club page. Club pages appear here after a verified club owner creates one.</Text>
          <Pressable onPress={() => setTab('owner')} style={styles.clubRetryButton}>
            <Text style={styles.clubRetryText}>{ownerStatus === 'verified' ? 'Manage club pages' : 'Club owner access'}</Text>
          </Pressable>
        </View>
      )}
      {!visibleClubs.length && <Text style={styles.emptyText}>No clubs within 50 miles match this search. Try another ZIP code or use Find near me.</Text>}
    </ScrollView>
  )

  const renderHome = () => (
    <ClubsScreen
      styles={styles}
      accountUsername={accountUsername}
      profileAvatarUrl={profileAvatarUrl}
      search={search}
      setSearch={setSearch}
      postalInput={postalInput}
      setPostalInput={setPostalInput}
      selectedClubCountry={selectedClubCountry}
      setCountryCode={setCountryCode}
      searchingPostalCode={searchingPostalCode}
      searchByPostalCode={searchByPostalCode}
      locatingClubs={locatingClubs}
      findNearbyActivities={findNearbyActivities}
      locationLabel={locationLabel}
      nearbyPlaces={nearbyPlaces}
      category={category}
      categories={categories}
      setCategory={setCategory}
      visibleClubs={visibleClubs}
      joined={joined}
      setSelectedClub={setSelectedClub}
      loadingNearbyPlaces={loadingNearbyPlaces}
      nearbyPlacesError={nearbyPlacesError}
      openNearbyPlace={openNearbyPlace}
      managedClubs={managedClubs}
      setSelectedManagedClub={setSelectedManagedClub}
      clubsLoading={clubsLoading}
      clubsError={clubsError}
      setClubsReloadKey={setClubsReloadKey}
      ownerStatus={ownerStatus}
      setTab={setTab}
      AppIcon={AppIcon}
      SectionTitle={SectionTitle}
      Avatar={Avatar}
      ClubCard={ClubCard}
      darkMode={isDark}
    />
  )

  const legacyRenderSchedule = () => (
    <ScrollView className="flex-1 bg-[#e9eee4] dark:bg-[#07110d]" contentContainerClassName="px-[18px] pb-7 pt-4">
      <ScreenHeader title="Schedule" />
      <View className="mb-3 rounded-[23px] border border-[#dfe7d9] bg-white p-3 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]">
        <View style={styles.weekCalendarHeader}>
          <Pressable onPress={() => moveScheduleWeek(-1)} accessibilityLabel="Previous week" style={styles.weekArrow}>
            <AppIcon name="chevron-back" size={17} />
          </Pressable>
          <Text style={styles.weekCalendarTitle} className="dark:text-[#f3f7f0]">
            {scheduleWeek[0].toLocaleDateString([], { month: 'long' })} {scheduleWeek[0].getDate()} – {scheduleWeek[6].toLocaleDateString([], { month: 'long' })} {scheduleWeek[6].getDate()}
          </Text>
          <Pressable onPress={() => moveScheduleWeek(1)} accessibilityLabel="Next week" style={styles.weekArrow}>
            <AppIcon name="chevron-forward" size={17} />
          </Pressable>
        </View>
        <View style={styles.weekDayRow}>
          {scheduleWeek.map((day) => {
            const selected = dateKey(day) === dateKey(selectedScheduleDate)
            const hasScheduledActivity = scheduleTrips.some((trip) => tripDateKey(trip) === dateKey(day))
            return (
              <Pressable
                key={dateKey(day)}
                onPress={() => setSelectedScheduleDate(day)}
                style={[styles.weekDay, selected && styles.weekDaySelected]}
                className="dark:bg-[#0d1a12]"
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={day.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              >
                <Text style={[styles.weekDayName, selected && styles.weekDayTextSelected]} className="dark:text-[#9eafa2]">{day.toLocaleDateString([], { weekday: 'short' })}</Text>
                <Text style={[styles.weekDayNumber, selected && styles.weekDayTextSelected]} className="dark:text-[#f3f7f0]">{day.getDate()}</Text>
                {hasScheduledActivity && <View style={[styles.weekEventDot, selected && styles.weekEventDotSelected]} />}
              </Pressable>
            )
          })}
        </View>
      </View>
      <View className="mb-4 rounded-[23px] border border-[#dfe7d9] bg-white p-3 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]">
        <View style={styles.fitnessRingsHeader}>
          <View>
            <Text style={styles.fitnessRingsTitle} className="dark:text-[#f3f7f0]">
              {dateKey(selectedScheduleDate) === dateKey(new Date()) ? "Today's movement" : `${selectedScheduleDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} movement`}
            </Text>
            <Text style={styles.fitnessRingsSub} className="dark:text-[#9eafa2]">
              {dateKey(selectedScheduleDate) === dateKey(new Date()) && dailyFitnessMetrics ? 'Synced today' : 'Completed activity estimate for this day'}
            </Text>
          </View>
        </View>
        <FitnessRings values={ringMetricsForDate(selectedScheduleDate)} />
        <Text style={styles.fitnessRingsNote} className="dark:text-[#9eafa2]">Daily goals are estimates. Stand / move hours count hours with recorded movement, not a medical measure of standing.</Text>
      </View>
      <View className="mb-4 rounded-[25px] bg-ink p-5 shadow-lg">
        <Text style={styles.highlightEyebrow}>UP NEXT</Text>
        <Text style={styles.highlightTitle}>{scheduleTrips[0]?.title ?? 'Make a plan outdoors'}</Text>
        <Text style={styles.highlightBody}>{scheduleTrips[0] ? `${scheduleTrips[0].shortDay}, ${scheduleTrips[0].shortDate} · ${scheduleTrips[0].time}` : 'Explore clubs and add an event to your schedule.'}</Text>
      </View>
      <View className="mb-4 rounded-[23px] border border-accent-200 bg-[#eef6d2] p-3 shadow-md dark:border-[#4b6138] dark:bg-[#16281c]">
        <View style={styles.scheduleTrackerHeader}>
          <View style={styles.scheduleTrackerIcon}><AppIcon name="fitness-outline" size={20} /></View>
          <View style={styles.scheduleTrackerCopy}>
            <Text style={styles.scheduleTrackerTitle}>Activity tracker</Text>
            <Text style={styles.scheduleTrackerSub}>Record a hike or run, or import workouts from your health app.</Text>
          </View>
        </View>
        <Pressable style={styles.scheduleTrackButton} onPress={() => setTab('activity')}>
          <Text style={styles.scheduleTrackText}>{activityStore.active ? 'Resume your activity' : 'Open activity tracker'}</Text>
          <AppIcon name="arrow-forward" size={16} />
        </Pressable>
      </View>
      {!!importedWorkouts.length && (
        <>
          <SectionTitle title="Synced workouts" />
          {importedWorkouts.slice(0, 3).map((workout) => (
            <View key={workout.id} style={styles.syncedWorkoutRow} className="rounded-[18px] border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]">
              <View style={styles.syncedWorkoutIcon}><AppIcon name="fitness" size={17} /></View>
              <View style={styles.syncedWorkoutCopy}>
                <Text style={styles.syncedWorkoutTitle} className="dark:text-[#f3f7f0]" numberOfLines={1}>{workout.title}</Text>
                <Text style={styles.syncedWorkoutSub} className="dark:text-[#9eafa2]">{workout.source} · {new Date(workout.startedAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.syncedWorkoutDistance}>{workout.distanceMeters ? `${(workout.distanceMeters / 1609.344).toFixed(1)} mi` : `${Math.round(workout.durationSeconds / 60)} min`}</Text>
            </View>
          ))}
        </>
      )}
      <SectionTitle
        title={selectedScheduleDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        action="Explore"
        onPress={() => setTab('explore')}
      />
      {selectedDayTrips.map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
      {!selectedDayTrips.length && <Text style={styles.emptyText}>No events on this day yet. Explore clubs to find your next activity.</Text>}
      <SectionTitle title="Discover events" />
      {trips.filter((trip) => !scheduleIds.includes(trip.id)).slice(0, 4).map((trip) => (
        <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />
      ))}
    </ScrollView>
  )

  const legacyRenderExplore = () => (
    <ScrollView className="flex-1 bg-[#e9eee4] dark:bg-[#07110d]" contentContainerClassName="px-[18px] pb-7 pt-4">
      <ScreenHeader title="Explore" />
      <View className="mb-2 rounded-[24px] border border-accent-200 bg-[#eef6d2] p-5 dark:border-[#4b6138] dark:bg-[#16281c]">
        <Text className="text-[25px] font-extrabold tracking-[-0.8px] text-ink dark:text-[#f3f7f0]">A little more outside.</Text>
        <Text className="mt-1 text-[13px] leading-[19px] text-slate-600 dark:text-[#9eafa2]">Find your next favorite place, activity, or crew.</Text>
      </View>
      <SectionTitle title="Upcoming near you" action="Schedule" onPress={() => setTab('schedule')} />
      {trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => openTrip(trip)} />)}
      <SectionTitle title="Community moments" />
      <View style={styles.mediaGrid}>
        {media.map((item) => (
          <Pressable key={item.id} style={styles.mediaTile} className="overflow-hidden rounded-[22px] shadow-lg" onPress={() => setTab('feed')}>
            <Image source={{ uri: item.image }} style={styles.mediaImage} />
            <View style={styles.mediaOverlay}>
              <Text style={styles.mediaCaption} numberOfLines={2}>{item.caption}</Text>
              <Text style={styles.mediaLikes}><AppIcon name="heart" size={13} color={colors.white} /> {item.likes}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )

  const renderSchedule = () => (
    <ScheduleScreen
      styles={styles}
      scheduleWeek={scheduleWeek}
      selectedScheduleDate={selectedScheduleDate}
      setSelectedScheduleDate={setSelectedScheduleDate}
      moveScheduleWeek={moveScheduleWeek}
      scheduleTrips={scheduleTrips}
      selectedDayTrips={selectedDayTrips}
      scheduleIds={scheduleIds}
      reserved={reserved}
      importedWorkouts={importedWorkouts}
      dailyFitnessMetrics={dailyFitnessMetrics}
      activityStore={activityStore}
      ringMetricsForDate={ringMetricsForDate}
      tripDateKey={tripDateKey}
      dateKey={dateKey}
      setTab={setTab}
      openTrip={openTrip}
      ScreenHeader={ScreenHeader}
      SectionTitle={SectionTitle}
      TripCard={TripCard}
      AppIcon={AppIcon}
      FitnessRings={FitnessRings}
      darkMode={isDark}
    />
  )

  const renderExplore = () => (
    <ExploreScreen
      styles={styles}
      colors={colors}
      trips={trips}
      media={media}
      reserved={reserved}
      setTab={setTab}
      openTrip={openTrip}
      ScreenHeader={ScreenHeader}
      SectionTitle={SectionTitle}
      TripCard={TripCard}
      AppIcon={AppIcon}
      darkMode={isDark}
    />
  )

  const legacyRenderProfile = () => (
    <ScrollView className="flex-1 bg-[#e9eee4] dark:bg-[#07110d]" contentContainerClassName="px-[18px] pb-7 pt-4">
      <ScreenHeader title={accountHandle} centerTitle action={
        <View style={styles.profileHeaderActions}>
          <Pressable
            style={styles.roundAction}
            accessibilityRole="button"
            accessibilityLabel="Open schedule"
            onPress={() => setTab('schedule')}
          >
            <AppIcon name="calendar-outline" />
          </Pressable>
          <Pressable
            style={styles.roundAction}
            accessibilityRole="button"
            accessibilityLabel="Edit profile settings"
            onPress={() => setSettingsVisible(true)}
          >
            <AppIcon name="settings-outline" />
          </Pressable>
        </View>
      } />
      <View className="rounded-[28px] border border-[#dfe7d9] bg-white p-4 shadow-lg dark:border-[#2a3b30] dark:bg-[#132018]">
        <View className="flex-row items-center">
          <Avatar name={accountUsername} size={82} photoUri={profileAvatarUrl} />
          <View className="ml-4 flex-1">
            <Text className="text-[20px] font-extrabold text-ink dark:text-[#f3f7f0]">{profileName || accountHandle}</Text>
              <View className="mt-3 flex-row justify-between pr-2">
              <View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{scheduleIds.length}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Events</Text></View>
              <View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{myPosts.length}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Posts</Text></View>
                <View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{followersCount}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Followers</Text></View>
                <View className="items-center"><Text className="text-base font-extrabold text-ink dark:text-[#f3f7f0]">{followingCount}</Text><Text className="text-[10px] text-slate-500 dark:text-[#9eafa2]">Following</Text></View>
            </View>
          </View>
        </View>
        <Text className="mt-4 text-xs leading-[18px] text-slate-500 dark:text-[#9eafa2]">{profileBio || 'Add a bio to tell the FitHive community about you.'}</Text>
        {!!joined.length && <View className="mt-4 border-t border-[#edf0e7] pt-4 dark:border-[#294032]">
          <Text className="mb-3 text-[10px] font-extrabold uppercase tracking-[1px] text-slate-500 dark:text-[#9eafa2]">Club badges</Text>
          <View className="flex-row flex-wrap gap-3">
            {joined.map((id, index) => {
              const club = clubById(id)
              return <Pressable key={id} onPress={() => setSelectedClub(club)} accessibilityRole="button" accessibilityLabel={`Open ${club.name} club page`}><ClubBadgeView badge={badgeForClub(id, index)} /></Pressable>
            })}
          </View>
        </View>}
        <View style={styles.accountActions}>
          <Pressable style={styles.accountAction} className="border-[#dfe7d9] bg-white dark:border-[#2a3b30] dark:bg-[#132018]" onPress={() => setTab('owner')}>
            <Text style={styles.simpleRowTitle} className="dark:text-[#f3f7f0]">{ownerStatus === 'verified' ? 'Manage your clubs' : ownerStatus === 'pending' ? 'Finish club owner verification' : 'Get club owner certified'}</Text>
            <Text style={styles.simpleRowSub} className="dark:text-[#9eafa2]">{ownerStatus === 'verified' ? 'Create club pages and manage members and updates.' : 'Confirm your email and review the draft owner documents.'}</Text>
          </Pressable>
        </View>
      </View>
      <SectionTitle title="Events" action="Schedule" onPress={() => setTab('schedule')} />
      {scheduleTrips.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-1">
          {scheduleTrips.map((trip) => (
            <Pressable key={trip.id} onPress={() => openTrip(trip)} className="w-[156px] rounded-[22px] border border-[#dfe7d9] bg-white p-3 shadow-md dark:border-[#2a3b30] dark:bg-[#132018]" accessibilityRole="button" accessibilityLabel={`Open ${trip.title} on ${trip.shortDate}`}>
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-[14px] bg-accent-200"><AppIcon name="calendar-outline" size={19} /></View>
              <Text className="text-[12px] font-extrabold leading-[17px] text-ink dark:text-[#f3f7f0]" numberOfLines={2}>{trip.title}</Text>
              <Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-[#9eafa2]">{trip.shortDay}, {trip.shortDate}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-5 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your scheduled events will appear here.</Text>}
      <SectionTitle title="Recently posted" />
      {!myPosts.length && <Text className="rounded-[20px] border border-dashed border-[#cbd8c5] bg-white/70 px-4 py-6 text-center text-xs text-slate-500 dark:border-[#4b6138] dark:bg-[#132018] dark:text-[#9eafa2]">Your recent posts will appear here.</Text>}
      {myPosts.map((post) => <PostCard key={post.id} post={post} photoUri={profileAvatarUrl} dark={isDark} following={false} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} onComments={() => setCommentsPostId(post.id)} onToggleFollow={() => {}} />)}
    </ScrollView>
  )

  const renderProfile = () => (
    <ProfileScreen
      styles={styles}
      accountHandle={accountHandle}
      accountUsername={accountUsername}
      profileName={profileName}
      profileBio={profileBio}
      profileAvatarUrl={profileAvatarUrl}
      scheduleIds={scheduleIds}
      myPosts={myPosts}
      followersCount={followersCount}
      followingCount={followingCount}
      joined={joined}
      scheduleTrips={scheduleTrips}
      ownerStatus={ownerStatus}
      dark={isDark}
      badgeForClub={badgeForClub}
      clubById={clubById}
      setTab={setTab}
      setSettingsVisible={setSettingsVisible}
      setSelectedClub={setSelectedClub}
      openTrip={openTrip}
      toggleLike={toggleLike}
      toggleSave={toggleSave}
      setCommentsPostId={setCommentsPostId}
      ScreenHeader={ScreenHeader}
      Avatar={Avatar}
      ClubBadgeView={ClubBadgeView}
      SectionTitle={SectionTitle}
      PostCard={PostCard}
      AppIcon={AppIcon}
    />
  )

  const renderBottomTabs = (onNavigate: (next: Tab) => void = (next) => setTab(next)) => (
    <View style={[styles.tabBar, {
      paddingBottom: Math.max(insets.bottom, 8),
      backgroundColor: isDark ? '#171C19' : '#F5F6F2',
      borderTopColor: isDark ? '#2B342F' : '#E3E6DF',
    }]}>
      {tabs.map((item) => {
        const active = tab === item.id
        return (
          <Pressable key={item.id} style={styles.tabButton} onPress={() => onNavigate(item.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item.label}>
            {item.id === 'profile' ? (
              <View style={[styles.profileTabRing, active && styles.profileTabRingActive]}>
                <Avatar name={accountUsername} size={24} photoUri={profileAvatarUrl} />
              </View>
            ) : <AppIcon name={active ? (activeTabIcons[item.id] ?? item.icon) : item.icon} size={23} color={active ? '#FF7900' : (isDark ? '#9CA6A0' : '#73776D')} />}
            <Text style={[styles.tabLabel, { color: active ? '#FF7900' : (isDark ? '#9CA6A0' : '#73776D') }, active && styles.tabLabelActive]}>{item.label}</Text>
            {active && <View style={styles.tabIndicator} />}
          </Pressable>
        )
      })}
    </View>
  )

  if (authLoading || !fontsLoaded || !appearanceReady) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.authLoading}><Text style={styles.authLoadingText}>Loading your account…</Text></View></SafeAreaView>
  }
  if (!session) return <AuthScreen client={supabaseClient} />

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeBackground }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.appBody}>
        {tab === 'home' && renderHome()}
        {tab === 'schedule' && renderSchedule()}
        {tab === 'activity' && (
          <ActivityScreen
            store={activityStore}
            elapsedSeconds={activeDuration}
            onStart={(kind: ActivityKind) => runActivityAction(() => beginActivity(kind))}
            onPause={() => { void runActivityAction(pauseActivity) }}
            onResume={() => { void runActivityAction(resumeActivity) }}
            onFinish={() => { void runActivityAction(finishActivity) }}
            ringMetrics={ringMetricsForDate(new Date())}
            darkMode={isDark}
            bottomTabs={renderBottomTabs()}
          />
        )}
        {tab === 'feed' && (
          <FeedScreen
            posts={posts}
            profileAvatarUrl={profileAvatarUrl}
            refreshing={refreshingFeed}
            loading={feedLoading}
            error={feedError}
            onRefresh={() => {
              setRefreshingFeed(true)
              setFeedReloadKey((current) => current + 1)
            }}
            onOpenNotifications={openNotifications}
            hasUnreadNotifications={notifications.some((notification) => !notification.read_at)}
            onCompose={() => { setDraftText(''); setDraftImage(undefined); setComposing(true) }}
            onLike={toggleLike}
            onSave={toggleSave}
            onComments={setCommentsPostId}
            followedHandles={followedHandles}
            onToggleFollow={(handle) => { void toggleFollow(handle) }}
            darkMode={isDark}
          />
        )}
        {tab === 'explore' && renderExplore()}
        {tab === 'profile' && renderProfile()}
        {tab === 'owner' && supabaseClient && session && (
          ownerStatus === 'verified'
            ? <OwnerTools client={supabaseClient} userId={session.user.id} />
            : <OwnerAccessScreen client={supabaseClient} status={ownerStatus} onStatusChanged={refreshOwnerStatus} />
        )}
      </View>
      {renderBottomTabs()}

      <Modal
        visible={!!selectedClub}
        animationType="slide"
        presentationStyle="pageSheet"
        allowSwipeDismissal
        onRequestClose={() => setSelectedClub(null)}
        onDismiss={() => setSelectedClub(null)}
      >
        {selectedClub && <SafeAreaView style={[styles.modalSafe, { backgroundColor: themeBackground }]} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={{ paddingBottom: 28, backgroundColor: themeBackground }}>
            <View style={{ height: 390, position: 'relative', overflow: 'hidden', backgroundColor: dark ? '#101510' : '#D7DBCF' }}>
              <Image source={{ uri: selectedClub.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, backgroundColor: 'rgba(0,0,0,0.62)' }} />
              <Pressable style={[styles.closeButton, { top: 16, left: 16, right: undefined }]} onPress={() => setSelectedClub(null)} accessibilityLabel="Close club">
                <AppIcon name="chevron-back" color={colors.white} />
              </Pressable>
              <View style={{ position: 'absolute', left: 18, right: 18, bottom: 22 }}>
                <Text style={{ color: '#FFB067', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>{selectedClub.category.toUpperCase()}</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 6 }}>{selectedClub.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}><AppIcon name="location-outline" size={15} color="#E5E7EB" /><Text style={{ color: '#E5E7EB', fontSize: 12 }}>{areas[selectedClub.zip]?.city}, {areas[selectedClub.zip]?.state}</Text></View>
              </View>
            </View>
            <View style={{ marginTop: -1, padding: 18, backgroundColor: themeSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>{selectedClub.members.toLocaleString()}</Text><Text style={{ color: themeMuted, fontSize: 10, marginTop: 3 }}>MEMBERS</Text></View>
                <View><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>{selectedClub.level}</Text><Text style={{ color: themeMuted, fontSize: 10, marginTop: 3 }}>LEVEL</Text></View>
                <View><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>{selectedClub.founded}</Text><Text style={{ color: themeMuted, fontSize: 10, marginTop: 3 }}>FOUNDED</Text></View>
              </View>
              <Text style={{ color: foreground, fontSize: 19, fontWeight: '900', marginBottom: 7 }}>Move together.</Text>
              <Text style={{ color: themeMuted, fontSize: 13, lineHeight: 20 }}>{selectedClub.mission}</Text>
              <View style={{ marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: dark ? '#222622' : '#F5F6F2', borderWidth: 1, borderColor: themeBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><AppIcon name="calendar-outline" color="#FF7900" /><View style={{ flex: 1 }}><Text style={{ color: foreground, fontSize: 12, fontWeight: '800' }}>Next meetup</Text><Text style={{ color: themeMuted, fontSize: 11, marginTop: 3 }}>{selectedClub.nextEvent} · {selectedClub.nextWhen}</Text></View></View>
              </View>
              <Text style={{ color: foreground, fontSize: 17, fontWeight: '900', marginTop: 22, marginBottom: 6 }}>About the club</Text>
              <Text style={{ color: themeMuted, fontSize: 13, lineHeight: 20 }}>{selectedClub.about}</Text>
              <Text style={{ color: themeMuted, fontSize: 11, lineHeight: 17, marginTop: 14 }}>Meets {selectedClub.meets}. Hosted by {selectedClub.owner}.</Text>
              <Pressable style={[styles.primaryButton, { backgroundColor: joined.includes(selectedClub.id) ? (dark ? '#2B332D' : '#E7EAE4') : '#FF7900', marginTop: 22 }]} onPress={() => toggleJoin(selectedClub.id)} accessibilityRole="button" accessibilityLabel={joined.includes(selectedClub.id) ? 'Leave club' : 'Join club'}>
                <AppIcon name={joined.includes(selectedClub.id) ? 'checkmark' : 'add'} color={joined.includes(selectedClub.id) ? foreground : '#FFFFFF'} />
                <Text style={{ color: joined.includes(selectedClub.id) ? foreground : '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{joined.includes(selectedClub.id) ? 'Joined' : 'Join club'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>}
      </Modal>

      <Modal visible={notificationsVisible} animationType="slide" onRequestClose={() => setNotificationsVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setNotificationsVisible(false)} accessibilityLabel="Close notifications"><AppIcon name="close" /></Pressable>
            <Text style={styles.sheetTitle}>Notifications</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsContent}>
            {!notifications.length && <Text style={styles.emptyText}>You’re all caught up.</Text>}
            {notifications.map((notification) => (
              <Pressable key={notification.id} onPress={() => { void markNotificationRead(notification) }} style={[styles.notificationRow, !notification.read_at && styles.notificationUnread]}>
                <View style={styles.notificationIcon}><AppIcon name={notification.type === 'follow' ? 'person-add-outline' : 'sparkles-outline'} color={colors.ink} /></View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationBody}>{notification.body}</Text>
                  <Text style={styles.notificationTime}>{new Date(notification.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                </View>
                {!notification.read_at && <View style={styles.notificationDot} />}
              </Pressable>
            ))}
          </ScrollView>
          {renderBottomTabs((next) => { setNotificationsVisible(false); setTab(next) })}
        </SafeAreaView>
      </Modal>

      <Modal visible={!!selectedTrip} animationType="slide" onRequestClose={() => setSelectedTrip(null)}>
        {selectedTrip && <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalImageWrap}>
              <Image source={{ uri: selectedTrip.image }} style={styles.modalHeroImage} />
              <Pressable style={styles.closeButton} onPress={() => setSelectedTrip(null)} accessibilityLabel="Close event">
                <AppIcon name="close" color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.modalPadding}>
              <Text style={styles.eyebrow}>{selectedTrip.dateLabel.toUpperCase()}</Text>
              <Text style={styles.modalTitle}>{selectedTrip.title}</Text>
              <Text style={styles.modalSub}>{selectedTrip.club}</Text>
              <View style={styles.detailInfo}><AppIcon name="time-outline" color={colors.muted} /><Text style={styles.bodyText}>{selectedTrip.time}</Text></View>
              <View style={styles.detailInfo}><AppIcon name="location-outline" color={colors.muted} /><Text style={styles.bodyText}>{selectedTrip.location} · {selectedTrip.locationNote}</Text></View>
              <View style={styles.detailNote}>
                <Text style={styles.travelTitle}>Getting there</Text>
                <Text style={styles.travelText}>
                  {selectedTrip.airport
                    ? `${selectedTrip.airport.name} (${selectedTrip.airport.code}) is the nearest listed airport.`
                    : `Distance-based drive estimate: ${formatDuration(driveMinutes(selectedTrip.miles))} (traffic not included).`}
                </Text>
                {!!selectedTrip.groundAfter && <Text style={styles.travelText}>Airport to event: about {formatDuration(selectedTrip.groundAfter.minutes)} by ground transport.</Text>}
              </View>
              {(selectedTrip.miles > 100 || selectedTrip.airport) && (
                <View style={styles.flightLookupCard}>
                  <Text style={styles.sectionTitle}>Flight status</Text>
                  <Text style={styles.bodyText}>Enter your airline flight number to check its latest published status.</Text>
                  <View style={styles.flightInputRow}>
                    <TextInput
                      value={flightNumber}
                      onChangeText={(value) => {
                        setFlightNumber(value.toUpperCase())
                        setFlightStatus(null)
                        setFlightLookupError('')
                      }}
                      placeholder="e.g. DL 1457"
                      autoCapitalize="characters"
                      style={styles.flightInput}
                      accessibilityLabel="Airline flight number"
                    />
                    <Pressable onPress={() => { void lookupFlight() }} disabled={lookingUpFlight || !flightNumber.trim()} style={[styles.flightLookupButton, (!flightNumber.trim() || lookingUpFlight) && styles.disabledAction]}>
                      <Text style={styles.flightLookupButtonText}>{lookingUpFlight ? 'Checking…' : 'Look up'}</Text>
                    </Pressable>
                  </View>
                  {!!flightLookupError && <Text accessibilityRole="alert" style={styles.errorText}>{flightLookupError}</Text>}
                  {!!flightStatus && (
                    <View style={styles.flightStatus}>
                      <Text style={styles.flightStatusTitle}>{flightStatus.airline || flightStatus.flightNumber} · {flightStatus.status || 'Status unavailable'}</Text>
                      <Text style={styles.travelText}>{flightStatus.departureAirport || 'Departure'}{flightStatus.departureGate ? ` · Gate ${flightStatus.departureGate}` : ''}</Text>
                      <Text style={styles.travelText}>Scheduled: {flightStatus.scheduledDeparture ? new Date(flightStatus.scheduledDeparture).toLocaleString() : 'Not available'}</Text>
                      {!!flightStatus.actualDeparture && <Text style={styles.travelText}>Departed: {new Date(flightStatus.actualDeparture).toLocaleString()}</Text>}
                      <Text style={[styles.travelText, { marginTop: 7 }]}>{flightStatus.arrivalAirport || 'Arrival'}{flightStatus.arrivalGate ? ` · Gate ${flightStatus.arrivalGate}` : ''}</Text>
                      <Text style={styles.travelText}>Scheduled: {flightStatus.scheduledArrival ? new Date(flightStatus.scheduledArrival).toLocaleString() : 'Not available'}</Text>
                      {!!flightStatus.actualArrival && <Text style={styles.travelText}>Arrived: {new Date(flightStatus.actualArrival).toLocaleString()}</Text>}
                      <Text style={styles.flightProviderAttribution}>Flight data by Aviationstack. Confirm details with your airline.</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.sectionTitle}>About this event</Text>
              <Text style={styles.bodyText}>{selectedTrip.objective}</Text>
              {selectedTrip.airport && <Text style={styles.detailNote}>Travel tip: nearest airport is {selectedTrip.airport.name} ({selectedTrip.airport.code}).</Text>}
              <Pressable style={[styles.primaryButton, reserved.includes(selectedTrip.id) && styles.secondaryButton]} onPress={() => {
                setReserved((current) => current.includes(selectedTrip.id) ? current.filter((id) => id !== selectedTrip!.id) : [...current, selectedTrip!.id])
                if (!scheduleIds.includes(selectedTrip.id)) setScheduleIds((current) => [...current, selectedTrip!.id])
              }}>
                <AppIcon name={reserved.includes(selectedTrip.id) ? 'checkmark' : 'calendar-outline'} />
                <Text style={styles.primaryButtonText}>{reserved.includes(selectedTrip.id) ? 'Reserved · Added to schedule' : 'Reserve my spot'}</Text>
              </Pressable>
              {scheduleIds.includes(selectedTrip.id) && <Pressable style={styles.removeButton} onPress={() => {
                setScheduleIds((current) => current.filter((id) => id !== selectedTrip.id))
                setReserved((current) => current.filter((id) => id !== selectedTrip.id))
                setSelectedTrip(null)
              }}><Text style={styles.removeButtonText}>Remove from schedule</Text></Pressable>}
            </View>
          </ScrollView>
        </SafeAreaView>}
      </Modal>

      <Modal visible={!!selectedManagedClub} animationType="slide" onRequestClose={() => setSelectedManagedClub(null)}>
        {selectedManagedClub && <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setSelectedManagedClub(null)} accessibilityLabel="Close club page"><AppIcon name="close" /></Pressable>
            <Text style={styles.sheetTitle}>Club page</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalPadding}>
            <Text style={styles.modalTitle}>{selectedManagedClub.name}</Text>
            {!!(selectedManagedClub.activity || selectedManagedClub.location) && <Text style={styles.modalSub}>{[selectedManagedClub.activity, selectedManagedClub.location].filter(Boolean).join(' · ')}</Text>}
            <View className="my-4 rounded-[22px] border border-accent-200 bg-[#f0f7d0] p-4 dark:border-[#4b6138] dark:bg-[#16281c]">
              <Text className="text-xs font-extrabold text-ink dark:text-[#f3f7f0]">Club badge</Text>
              <Text className="mt-1 text-[10px] leading-[15px] text-slate-600 dark:text-[#9eafa2]">Choose a badge for your club page or import your own image.</Text>
              <View className="mt-3 flex-row items-center gap-3">
                <ClubBadgeView badge={badgeForClub(selectedManagedClub.id)} size={52} />
                <View className="flex-1 flex-row flex-wrap gap-2">
                  {badgeOptions.map((badge) => <Pressable key={badge} onPress={() => setClubBadges((current) => ({ ...current, [selectedManagedClub.id]: { type: 'icon', value: badge } }))} className="h-10 w-10 items-center justify-center rounded-full border border-white bg-white dark:bg-[#132018]" accessibilityLabel={`Use ${badge} badge`}><Ionicons name={badge} size={18} color={colors.ink} /></Pressable>)}
                  <Pressable onPress={() => { void importClubBadge(selectedManagedClub.id) }} className="h-10 flex-row items-center justify-center gap-1 rounded-full border border-ink bg-ink px-3" accessibilityRole="button"><Ionicons name="images-outline" size={15} color={colors.white} /><Text className="text-[10px] font-extrabold text-white">Import</Text></Pressable>
                </View>
              </View>
            </View>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{selectedManagedClub.description || 'This club has not added a description yet.'}</Text>
            {!!managedClubUpdates.length && <Text style={styles.sectionTitle}>Club updates</Text>}
            {managedClubUpdates.map((body, index) => <Text key={`${index}-${body}`} style={styles.bodyText}>{body}</Text>)}
            {selectedManagedClub.owner_id !== session?.user.id && (
              <Pressable
                style={[styles.primaryButton, managedMemberships[selectedManagedClub.id] && styles.secondaryButton]}
                disabled={!!managedMemberships[selectedManagedClub.id]}
                onPress={() => { void requestManagedClubMembership() }}
              >
                <AppIcon name={managedMemberships[selectedManagedClub.id] === 'active' ? 'checkmark' : 'people-outline'} />
                <Text style={styles.primaryButtonText}>
                  {managedMemberships[selectedManagedClub.id] === 'active' ? 'Member' : managedMemberships[selectedManagedClub.id] === 'pending' ? 'Request pending' : managedMemberships[selectedManagedClub.id] === 'rejected' ? 'Request declined' : 'Request to join'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>}
      </Modal>

      <Modal visible={editingProfile} animationType="slide" onRequestClose={() => setEditingProfile(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <View style={{ width: 52 }} />
            <Text style={styles.sheetTitle}>Profile settings</Text>
            <View style={{ width: 52 }} />
          </View>
          <ScrollView contentContainerStyle={styles.profileEditContent} keyboardShouldPersistTaps="handled">
            <View style={styles.profilePhotoEditor}>
              <Avatar name={accountUsername} size={88} photoUri={editAvatarUri} />
              <View style={styles.profilePhotoActions}>
                <Pressable style={styles.photoActionButton} onPress={() => { void pickProfilePhoto('camera') }}>
                  <AppIcon name="camera-outline" color={colors.ink} size={17} />
                  <Text style={styles.photoActionText}>Take photo</Text>
                </Pressable>
                <Pressable style={styles.photoActionButton} onPress={() => { void pickProfilePhoto('library') }}>
                  <AppIcon name="images-outline" color={colors.ink} size={17} />
                  <Text style={styles.photoActionText}>Choose from gallery</Text>
                </Pressable>
                {!!editAvatarUri && (
                  <Pressable onPress={() => { setEditAvatarUri(null); setAvatarChanged(true) }}>
                    <Text style={styles.removePhotoText}>Remove photo</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={styles.profileEditLabel}>USERNAME</Text>
            <TextInput
              value={editUsername}
              onChangeText={(value) => setEditUsername(value.replace(/^@/, '').toLowerCase())}
              placeholder="@username"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.profileEditInput}
            />
            <Text style={styles.profileEditLabel}>DISPLAY NAME</Text>
            <TextInput
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Your name"
              maxLength={80}
              autoCapitalize="words"
              style={styles.profileEditInput}
            />
            <Text style={styles.profileEditLabel}>BIO</Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder="A little about you"
              maxLength={280}
              multiline
              textAlignVertical="top"
              style={[styles.profileEditInput, styles.profileBioInput]}
            />
            <Text style={styles.profileCharacterCount}>{editBio.length}/280</Text>
            {!!profileError && <Text accessibilityRole="alert" style={styles.errorText}>{profileError}</Text>}
          </ScrollView>
          <View className="flex-row gap-3 border-t border-[#dfe7d9] bg-[#f4f7f1] p-4 dark:border-[#2b3a2d] dark:bg-[#10130f]">
            <Pressable onPress={() => setEditingProfile(false)} className="h-12 flex-1 items-center justify-center rounded-full border border-[#cbd8c5] bg-white dark:border-[#46552d] dark:bg-[#18221a]" accessibilityLabel="Cancel profile edits">
              <Text className="text-sm font-extrabold text-ink dark:text-slate-100">Cancel</Text>
            </Pressable>
            <Pressable onPress={() => { void saveProfile() }} disabled={savingProfile} className="h-12 flex-1 items-center justify-center rounded-full bg-accent-200" accessibilityLabel="Save profile edits">
              <Text className={`text-sm font-extrabold text-ink ${savingProfile ? 'opacity-50' : ''}`}>{savingProfile ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        styles={styles}
        themeBackground={themeBackground}
        themeSurface={themeSurface}
        themeText={themeText}
        themeMuted={themeMuted}
        themeBorder={themeBorder}
        isDark={isDark}
        accountUsername={accountUsername}
        accountHandle={accountHandle}
        email={session?.user.email}
        profileAvatarUrl={profileAvatarUrl}
        accountSettingsError={accountSettingsError}
        healthProvider={healthProvider}
        importedWorkouts={importedWorkouts}
        syncingHealth={syncingHealth}
        ownerStatus={ownerStatus}
        appearancePreference={appearancePreference}
        setAppearance={changeAppearance}
        beginProfileEdit={beginProfileEdit}
        connectHealthProvider={() => { void connectHealthProvider() }}
        disconnectHealthProvider={() => { void disconnectHealthProvider() }}
        setTab={setTab}
        signOut={() => { void signOut() }}
        renderBottomTabs={renderBottomTabs}
        AppIcon={AppIcon}
        Avatar={Avatar}
      />

      <Modal visible={false} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: themeBackground }]} edges={['top', 'bottom']}>
          <View style={[styles.sheetHeader, { backgroundColor: themeSurface, borderBottomColor: themeBorder }]}>
            <Pressable onPress={() => setSettingsVisible(false)} accessibilityLabel="Close settings"><AppIcon name="close" /></Pressable>
            <Text style={[styles.sheetTitle, { color: themeText }]}>Settings</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: themeBackground }} contentContainerStyle={styles.settingsContent}>
            <View style={[styles.settingsAccount, settingsSurface]}>
              <Avatar name={accountUsername} size={48} photoUri={profileAvatarUrl} />
              <View style={styles.simpleRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>{accountHandle}</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>{session?.user.email}</Text>
              </View>
            </View>
            {!!accountSettingsError && (
              <View style={styles.settingsWarning}>
                <Text style={styles.settingsWarningTitle}>Account setup needs attention</Text>
                <Text style={styles.settingsWarningText}>{accountSettingsError}</Text>
              </View>
            )}
            <Text style={styles.settingsSectionLabel}>ACCOUNT</Text>
            <Pressable style={[styles.settingsRow, settingsSurface]} onPress={() => {
              setEditDisplayName(profileName)
              setEditUsername(accountUsername)
              setEditAvatarUri(profileAvatarUrl)
              setEditAvatarMimeType('image/jpeg')
              setAvatarChanged(false)
              setEditBio(profileBio)
              setProfileError('')
              setSettingsVisible(false)
              setEditingProfile(true)
            }}>
              <AppIcon name="person-circle-outline" color="#FF7900" />
              <View style={styles.settingsRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>Edit profile</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>Change your photo, username, display name, and bio</Text>
              </View>
              <AppIcon name="chevron-forward" color={colors.muted} />
            </Pressable>
            <View style={[styles.settingsRow, settingsSurface]}>
              <AppIcon name="mail-outline" color="#FF7900" />
              <View style={styles.settingsRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>Email address</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>{session?.user.email || 'Not available'}</Text>
              </View>
            </View>
            <Text style={styles.settingsSectionLabel}>PREFERENCES & CONNECTED APPS</Text>
            <View style={[styles.appearanceCard, settingsSurface]}>
              <View style={styles.appearanceHeader}>
                <View style={styles.appearanceIcon}>
                  <AppIcon name="contrast-outline" color={colors.ink} />
                </View>
                <View style={styles.settingsRowCopy}>
                  <Text style={[styles.simpleRowTitle, { color: themeText }]}>Appearance</Text>
                  <Text style={[styles.simpleRowSub, { color: themeMuted }]}>Choose how FitHive looks on this device</Text>
                </View>
              </View>
              <View style={styles.appearanceOptions}>
                {([
                  ['system', 'Use device settings', 'phone-portrait-outline'],
                  ['light', 'Light', 'sunny-outline'],
                  ['dark', 'Dark', 'moon-outline'],
                ] as const).map(([value, label, icon]) => (
                  <Pressable
                    key={value}
                    onPress={() => changeAppearance(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: appearancePreference === value }}
                    style={[styles.appearanceOption, { backgroundColor: isDark ? '#202823' : '#FAFBF8', borderColor: themeBorder }, appearancePreference === value && { backgroundColor: '#FF7900', borderColor: '#FF7900' }]}
                  >
                    <AppIcon name={icon} size={16} color={appearancePreference === value ? '#FFFFFF' : themeMuted} />
                    <Text style={[styles.appearanceOptionText, { color: appearancePreference === value ? '#FFFFFF' : themeMuted }, appearancePreference === value && styles.appearanceOptionTextSelected]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.settingsRow, settingsSurface]}>
              <AppIcon name="heart-circle-outline" color="#FF7900" />
              <View style={styles.settingsRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>Fitness app connections</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>
                  {healthProvider
                    ? `${healthProvider} connected · ${importedWorkouts.length} workouts imported`
                    : Platform.OS === 'ios'
                      ? 'Connect Apple Health and devices that share data with it'
                      : 'Connect Health Connect and compatible fitness devices'}
                </Text>
              </View>
            </View>
            <Text style={styles.connectedDeviceHint}>
              {Platform.OS === 'ios'
                ? 'Wearables and apps that write workouts and activity to Apple Health can sync here, including compatible Garmin, Fitbit, Oura, and other apps.'
                : 'Connect compatible apps and devices through Health Connect, including supported Fitbit, Samsung Health, Garmin, and other sources.'}
            </Text>
            {healthProvider ? (
              <View style={styles.healthSettingsActions}>
                <Pressable onPress={connectHealthProvider} disabled={syncingHealth} style={styles.healthSettingsButton}>
                  <Text style={styles.healthSettingsButtonText}>{syncingHealth ? 'Syncing…' : 'Sync now'}</Text>
                </Pressable>
                <Pressable onPress={disconnectHealthProvider} disabled={syncingHealth} style={styles.disconnectSettingsButton}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={connectHealthProvider}
                disabled={syncingHealth || Platform.OS === 'web'}
                style={[styles.healthSettingsButton, (syncingHealth || Platform.OS === 'web') && styles.disabledAction]}
              >
                <Text style={styles.healthSettingsButtonText}>
                  {Platform.OS === 'web' ? 'Connect on mobile' : syncingHealth ? 'Connecting…' : `Connect ${Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}`}
                </Text>
              </Pressable>
            )}
            <Pressable style={[styles.settingsRow, settingsSurface]} onPress={() => { setSettingsVisible(false); setTab('activity') }}>
              <AppIcon name="navigate-circle-outline" color="#FF7900" />
              <View style={styles.settingsRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>Activity tracking</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>GPS tracking, routes, and activity history</Text>
              </View>
              <AppIcon name="chevron-forward" color={colors.muted} />
            </Pressable>
            <Text style={styles.settingsSectionLabel}>CLUBS</Text>
            <Pressable style={[styles.settingsRow, settingsSurface]} onPress={() => { setSettingsVisible(false); setTab('owner') }}>
              <AppIcon name="people-circle-outline" color="#FF7900" />
              <View style={styles.settingsRowCopy}>
                <Text style={[styles.simpleRowTitle, { color: themeText }]}>Club owner access</Text>
                <Text style={[styles.simpleRowSub, { color: themeMuted }]}>{ownerStatus === 'verified' ? 'Manage your club pages' : 'Request or check owner access'}</Text>
              </View>
              <AppIcon name="chevron-forward" color={colors.muted} />
            </Pressable>
            <Text style={styles.settingsPrivacy}>FitHive uses your location only for activity tracking and fitness data only when you connect a health app. You can manage those permissions in your device settings.</Text>
            <Pressable style={styles.settingsSignOut} onPress={() => { void signOut() }}>
              <AppIcon name="log-out-outline" color="#a32020" />
              <Text style={styles.signOutLabel}>Sign out</Text>
            </Pressable>
          </ScrollView>
          {renderBottomTabs((next) => { setSettingsVisible(false); setTab(next) })}
        </SafeAreaView>
      </Modal>

      <Modal visible={!!commentsPost} animationType="slide" onRequestClose={() => setCommentsPostId(null)}>
        {commentsPost && <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setCommentsPostId(null)} accessibilityLabel="Close comments"><AppIcon name="close" /></Pressable>
            <Text style={styles.sheetTitle}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsContent}>
            <Text style={styles.commentPostText}>{commentsPost.text}</Text>
            {commentsPost.comments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <Avatar name={comment.author} size={34} photoUri={comment.mine ? profileAvatarUrl : null} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>@{comment.handle}</Text>
                  <Text style={styles.bodyText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>{comment.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.commentInputRow}>
            <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add a comment..." placeholderTextColor={colors.muted} style={styles.commentInput} returnKeyType="send" onSubmitEditing={addComment} />
            <Pressable onPress={addComment} style={styles.sendButton} accessibilityLabel="Send comment"><AppIcon name="arrow-up" color={colors.white} /></Pressable>
          </View>
        </SafeAreaView>}
      </Modal>

      <Modal visible={composing} animationType="slide" onRequestClose={closeComposer}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.composer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheetHeader}>
              <View style={{ width: 52 }} />
              <Text style={styles.sheetTitle}>New post</Text>
              <View style={{ width: 52 }} />
            </View>
            <View style={styles.composeAuthor}>
              <Avatar name={accountUsername} size={42} photoUri={profileAvatarUrl} />
              <View><Text style={styles.postAuthor}>{accountHandle}</Text><Text style={styles.postSubline}>Share with the community</Text></View>
            </View>
            <TextInput
              value={draftText}
              onChangeText={(value) => setDraftText(value.slice(0, 280))}
              placeholder="What's happening outside?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={280}
              style={styles.composeTextInput}
              textAlignVertical="top"
              autoFocus
            />
            {!!draftImage && <View style={styles.composeImageWrap}>
              <Image source={{ uri: draftImage }} style={styles.composeImage} />
              <Pressable style={styles.removeImageButton} onPress={() => setDraftImage(undefined)} accessibilityLabel="Remove image"><AppIcon name="close" color={colors.white} /></Pressable>
            </View>}
            <View style={styles.composeFooter}>
              <TextInput value={draftLocation} onChangeText={setDraftLocation} placeholder="Add location" placeholderTextColor={colors.muted} style={styles.locationInput} />
              <Text style={styles.characterCount}>{280 - draftText.length}</Text>
            </View>
            <Pressable onPress={() => Alert.alert('Add a photo', 'Choose how you want to add a photo to your post.', [
              { text: 'Take photo', onPress: () => { void pickImage('camera') } },
              { text: 'Choose from gallery', onPress: () => { void pickImage('library') } },
              { text: 'Cancel', style: 'cancel' },
            ])} style={styles.addPhotoButton}>
              <AppIcon name="image-outline" color={colors.blue} />
              <Text style={styles.addPhotoText}>{draftImage ? 'Change photo' : 'Add photo'}</Text>
            </Pressable>
            <View className="mt-auto flex-row gap-3 border-t border-[#dfe7d9] bg-[#f4f7f1] p-4 dark:border-[#2b3a2d] dark:bg-[#10130f]">
              <Pressable onPress={closeComposer} className="h-12 flex-1 items-center justify-center rounded-full border border-[#cbd8c5] bg-white dark:border-[#46552d] dark:bg-[#18221a]" accessibilityLabel="Cancel new post">
                <Text className="text-sm font-extrabold text-ink dark:text-slate-100">Cancel</Text>
              </Pressable>
              <Pressable onPress={submitPost} disabled={!draftText.trim() && !draftImage} className={`h-12 flex-1 items-center justify-center rounded-full bg-accent-200 ${!draftText.trim() && !draftImage ? 'opacity-50' : ''}`} accessibilityLabel="Publish post">
                <Text className="text-sm font-extrabold text-ink">Post</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  appBody: { flex: 1 },
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  authLoadingText: { color: colors.muted, fontSize: 13 },
  screenContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  clubsScreen: { backgroundColor: '#f4f7f1' },
  scheduleScreen: { backgroundColor: '#f4f7f1' },
  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 },
  screenHeaderSpacer: { width: 93 },
  screenHeading: { flex: 1 },
  screenHeadingCentered: { alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  screenTitle: { fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -1.1 },
  screenTitleCentered: { textAlign: 'center', width: '100%', fontSize: 25, letterSpacing: -0.4, fontWeight: '900' },
  screenWordmark: { fontFamily: 'Pacifico_400Regular', fontSize: 30, lineHeight: 40, letterSpacing: 0, fontWeight: '400' },
  roundAction: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  profileHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 13, height: 50, borderWidth: 1, borderColor: '#dfe7d9', marginBottom: 10, shadowColor: '#17351e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 0 },
  zipRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  zipInputBox: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, height: 46 },
  countryCodeBox: { flex: 0, width: 116, justifyContent: 'center', paddingHorizontal: 8 },
  countryCodeInput: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'center', paddingVertical: 0 },
  zipInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 0 },
  searchButton: { backgroundColor: colors.ink, minWidth: 78, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  nearMeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#dfe7d9', marginTop: -5, marginBottom: 12 },
  nearMeText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  locationBanner: { backgroundColor: '#f0f7d0', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderWidth: 1, borderColor: '#d9e98b' },
  locationBannerText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  mutedText: { color: colors.muted, fontWeight: '500' },
  nearbyAttribution: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -7, marginBottom: 10 },
  activityIdeaList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  activityIdeaChip: { backgroundColor: '#eee8ff', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 },
  activityIdeaText: { color: '#FF7900', fontSize: 11, fontWeight: '700' },
  nearbyPlaceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginBottom: 8, backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  nearbyPlaceIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  nearbyPlaceCopy: { flex: 1 },
  nearbyPlaceName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  nearbyPlaceActivities: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  chipList: { gap: 7, paddingBottom: 15 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1, borderColor: '#dfe7d9', backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  chipTextSelected: { fontWeight: '800' },
  clubCard: { backgroundColor: colors.white, borderRadius: 26, overflow: 'hidden', marginBottom: 16, borderWidth: 0, borderColor: 'transparent', shadowColor: '#17351e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 },
  clubImage: { width: '100%', height: 168, backgroundColor: '#d7dbcf' },
  clubImageFallback: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF4EB' },
  clubImageFallbackText: { color: '#9F4100', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  clubImageShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 168, backgroundColor: '#00000016' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 },
  categoryBadgeText: { color: colors.ink, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  joinedBadge: { position: 'absolute', top: 11, right: 11, backgroundColor: colors.lime, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  clubCardBody: { padding: 16 },
  clubName: { color: colors.ink, fontSize: 19, fontWeight: '800', marginBottom: 5 },
  clubMission: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metaText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  avatar: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { position: 'absolute' },
  avatarText: { color: colors.ink, fontWeight: '800' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  textLink: { fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  highlightCard: { backgroundColor: colors.ink, borderRadius: 25, padding: 19, marginBottom: 14, shadowColor: '#17351e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 },
  highlightEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  highlightTitle: { color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '800', marginTop: 9 },
  highlightBody: { color: '#e2e5dc', fontSize: 12, lineHeight: 18, marginTop: 7 },
  weekCalendar: { backgroundColor: colors.white, borderRadius: 23, padding: 13, marginBottom: 13, borderWidth: 1, borderColor: '#dfe7d9', shadowColor: '#17351e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  weekCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  weekCalendarTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  weekArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f0f7d0' },
  weekDayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDay: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 13, gap: 3 },
  weekDaySelected: { backgroundColor: colors.lime },
  weekDayName: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  weekDayNumber: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  weekDayTextSelected: { color: colors.ink },
  weekEventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue },
  weekEventDotSelected: { backgroundColor: colors.ink },
  fitnessRingsCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#dfe7d9', borderRadius: 23, padding: 13, marginBottom: 15, shadowColor: '#17351e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  fitnessRingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fitnessRingsTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  fitnessRingsSub: { color: colors.muted, fontSize: 9, marginTop: 3 },
  fitnessRingsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 13 },
  fitnessRingItem: { alignItems: 'center', minWidth: 90 },
  fitnessRingLabel: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  fitnessRingGoal: { color: colors.muted, fontSize: 8, marginTop: 2 },
  fitnessRingsNote: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 10 },
  scheduleTrackerCard: { backgroundColor: '#eef6d2', borderRadius: 23, padding: 13, marginBottom: 17, borderWidth: 1, borderColor: '#d9e98b', shadowColor: '#17351e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  scheduleTrackerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleTrackerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  scheduleTrackerCopy: { flex: 1 },
  scheduleTrackerTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  scheduleTrackerSub: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  scheduleTrackButton: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
  scheduleTrackText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  healthDivider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  healthConnectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthConnectCopy: { flex: 1 },
  healthConnectTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  healthConnectSub: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  healthConnectButton: { backgroundColor: colors.ink, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 8 },
  healthConnectButtonText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  disabledAction: { opacity: 0.45 },
  disconnectButton: { alignSelf: 'flex-start', paddingTop: 9 },
  disconnectText: { color: colors.muted, fontSize: 9, textDecorationLine: 'underline' },
  webHealthNote: { color: '#98631a', fontSize: 9, lineHeight: 14, marginTop: 8 },
  healthPrivacyNote: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 8 },
  syncedWorkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  syncedWorkoutIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  syncedWorkoutCopy: { flex: 1 },
  syncedWorkoutTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  syncedWorkoutSub: { color: colors.muted, fontSize: 9, marginTop: 3 },
  syncedWorkoutDistance: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#dfe7d9', backgroundColor: colors.white, borderRadius: 22, padding: 10, marginBottom: 10, shadowColor: '#17351e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 9, elevation: 2 },
  tripImage: { width: 68, height: 76, borderRadius: 13, backgroundColor: '#d7dbcf' },
  tripInfo: { flex: 1 },
  tripTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reservedLabel: { color: '#4b6510', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  tripName: { color: colors.ink, fontWeight: '800', fontSize: 13, marginTop: 5 },
  tripMeta: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 4 },
  tripClub: { color: colors.muted, fontSize: 9, marginTop: 4, fontWeight: '700' },
  composePrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 15 },
  composePromptText: { color: colors.muted, fontSize: 13, flex: 1 },
  composePlus: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  postCard: { backgroundColor: colors.white, borderRadius: 21, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 13 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  postAuthorInfo: { flex: 1 },
  postAuthor: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  postSubline: { color: colors.muted, fontSize: 10, marginTop: 3 },
  postText: { color: colors.ink, fontSize: 14, lineHeight: 21, marginBottom: 11 },
  postImage: { width: '100%', height: 230, borderRadius: 15, backgroundColor: '#d7dbcf' },
  postLocation: { color: colors.muted, fontSize: 11, marginTop: 9 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 20, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 12, paddingTop: 11 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  postActionSpacer: { flex: 1 },
  commentPreview: { marginTop: 10 },
  commentPreviewText: { color: colors.ink, fontSize: 11, lineHeight: 16 },
  commentAuthor: { color: colors.ink, fontWeight: '800' },
  exploreIntro: { backgroundColor: colors.blue, borderRadius: 22, padding: 18, marginBottom: 12 },
  exploreIntroTitle: { color: colors.white, fontSize: 21, fontWeight: '800' },
  exploreIntroText: { color: '#e8ebff', fontSize: 12, lineHeight: 17, marginTop: 6 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mediaTile: { width: '48.5%', height: 185, borderRadius: 17, overflow: 'hidden', marginBottom: 9, backgroundColor: '#d7dbcf' },
  mediaImage: { width: '100%', height: '100%' },
  mediaOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: '#00000088' },
  mediaCaption: { color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  mediaLikes: { color: colors.white, fontSize: 10, fontWeight: '700', marginTop: 5 },
  profileCard: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 20 },
  profileName: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 10 },
  profileHandle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  profileBio: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10, maxWidth: 260 },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderTopColor: colors.line, marginTop: 17, paddingTop: 14 },
  profileStatValue: { color: colors.ink, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  profileStatLabel: { color: colors.muted, textAlign: 'center', fontSize: 10, marginTop: 3 },
  simpleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  simpleRowCopy: { flex: 1 },
  simpleRowTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  simpleRowSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  accountActions: { gap: 8, marginTop: 12 },
  accountAction: { padding: 13, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  signOutLabel: { color: '#a32020', fontSize: 12, fontWeight: '800' },
  settingsContent: { padding: 18, paddingBottom: 32, gap: 10 },
  settingsAccount: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 5, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  settingsWarning: { padding: 13, borderRadius: 14, backgroundColor: '#fff2df', gap: 4 },
  settingsWarningTitle: { color: '#70420d', fontSize: 12, fontWeight: '800' },
  settingsWarningText: { color: '#70420d', fontSize: 11, lineHeight: 16 },
  settingsSectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 12, marginBottom: 2 },
  settingsRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  settingsRowCopy: { flex: 1 },
  appearanceCard: { padding: 13, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  appearanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appearanceIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  appearanceOptions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  appearanceOption: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fafbf8' },
  appearanceOptionSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  appearanceOptionText: { color: colors.muted, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  appearanceOptionTextSelected: { color: colors.ink, fontWeight: '900' },
  settingsPrivacy: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 12, paddingHorizontal: 3 },
  settingsSignOut: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, borderRadius: 24, backgroundColor: '#fff0f0' },
  connectedDeviceHint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginHorizontal: 4, marginTop: -4 },
  healthSettingsActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 5 },
  healthSettingsButton: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#FF7900' },
  healthSettingsButtonText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  disconnectSettingsButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 8 },
  clubEmptyCard: { padding: 15, backgroundColor: '#eee8ff', borderRadius: 16, marginTop: 8 },
  clubEmptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  clubEmptyText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  clubLoadError: { padding: 14, backgroundColor: '#fff0f0', borderRadius: 15, marginTop: 8 },
  clubLoadErrorTitle: { color: '#a32020', fontSize: 12, fontWeight: '800' },
  clubLoadErrorText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  clubRetryButton: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.white },
  clubRetryText: { color: '#FF7900', fontSize: 11, fontWeight: '800' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 9, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54, position: 'relative' },
  tabLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  tabLabelActive: { fontWeight: '800' },
  tabIndicator: { width: 24, height: 3, borderRadius: 2, backgroundColor: '#FF7900', position: 'absolute', top: -9 },
  profileTabRing: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  profileTabRingActive: { borderColor: '#FF7900' },
  modalSafe: { flex: 1, backgroundColor: colors.paper },
  modalScroll: { paddingBottom: 24 },
  modalImageWrap: { height: 250, position: 'relative', backgroundColor: '#d7dbcf' },
  modalHeroImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 16, right: 16, width: 38, height: 38, borderRadius: 20, backgroundColor: '#151712aa', alignItems: 'center', justifyContent: 'center' },
  modalPadding: { paddingHorizontal: 19, paddingTop: 19, paddingBottom: 12 },
  profileEditContent: { padding: 18, gap: 9 },
  profilePhotoEditor: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 8 },
  profilePhotoActions: { flex: 1, gap: 8, alignItems: 'flex-start' },
  photoActionButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  photoActionText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  removePhotoText: { color: '#a32020', fontSize: 11, fontWeight: '700', paddingHorizontal: 4, paddingVertical: 3 },
  profileEditLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 7 },
  profileEditInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.white, fontSize: 14 },
  profileBioInput: { minHeight: 120, paddingTop: 12 },
  profileCharacterCount: { color: colors.muted, fontSize: 10, textAlign: 'right' },
  profileSaveText: { color: '#FF7900', fontSize: 13, fontWeight: '800' },
  errorText: { color: '#a32020', fontSize: 12, lineHeight: 17 },
  modalTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '800', marginTop: 3 },
  modalSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  bodyText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  detailInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 13 },
  detailNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14, padding: 12, backgroundColor: '#e9ebdf', borderRadius: 12 },
  travelTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  travelText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  flightLookupCard: { marginTop: 14, padding: 13, backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  flightInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  flightInput: { flex: 1, height: 43, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.paper },
  flightLookupButton: { minWidth: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 11, backgroundColor: '#FF7900' },
  flightLookupButtonText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  flightStatus: { marginTop: 11, padding: 11, borderRadius: 12, backgroundColor: colors.paper },
  flightStatusTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  flightProviderAttribution: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 8 },
  primaryButton: { minHeight: 49, borderRadius: 25, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 20 },
  secondaryButton: { backgroundColor: '#e5e8dc' },
  primaryButtonText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  removeButton: { alignItems: 'center', padding: 14 },
  removeButtonText: { color: '#d54b60', fontSize: 12, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', paddingVertical: 30, paddingHorizontal: 15 },
  sheetHeader: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  commentsList: { flex: 1 },
  commentsContent: { padding: 16, paddingBottom: 28 },
  notificationRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, marginBottom: 8, borderRadius: 18, backgroundColor: colors.white },
  notificationUnread: { borderWidth: 1, borderColor: '#d9e98b', backgroundColor: '#f5f9df' },
  notificationIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  notificationBody: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  notificationTime: { color: colors.muted, fontSize: 9, marginTop: 5 },
  notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e9516c' },
  commentPostText: { color: colors.ink, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  commentRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginBottom: 13 },
  commentBubble: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 11, borderWidth: 1, borderColor: colors.line },
  commentTime: { color: colors.muted, fontSize: 9, marginTop: 6 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderColor: colors.line, padding: 12 },
  commentInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14, height: 42, color: colors.ink, fontSize: 13 },
  sendButton: { width: 38, height: 38, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  composer: { flex: 1 },
  cancelText: { color: colors.ink, fontSize: 13 },
  postButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.lime },
  postButtonText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  composeAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 17 },
  composeTextInput: { color: colors.ink, fontSize: 16, lineHeight: 23, paddingHorizontal: 18, minHeight: 130 },
  composeImageWrap: { marginHorizontal: 18, marginVertical: 10, height: 220, borderRadius: 15, overflow: 'hidden' },
  composeImage: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#151712aa', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  composeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 9 },
  locationInput: { flex: 1, color: colors.ink, fontSize: 12, paddingVertical: 4 },
  characterCount: { color: colors.muted, fontSize: 11 },
  addPhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', margin: 18, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white },
  addPhotoText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
})
