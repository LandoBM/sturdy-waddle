import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { areas, clubById, clubs, distanceFor, media, type Category, type Club } from '../src/data'
import { ME, seedPosts, type Post } from '../src/posts'
import { tripById, trips, type Trip } from '../src/trips'
import { ActivityScreen } from './ActivityScreen'
import {
  beginActivity,
  finishActivity,
  getActivityStore,
  pauseActivity,
  resumeActivity,
  type ActivityKind,
  type ActivityStore,
} from './activity'
import { loadHealthProvider, loadImportedWorkouts, saveHealthProvider, syncHealthWorkouts, type ImportedWorkout } from './health'

type Tab = 'home' | 'schedule' | 'activity' | 'feed' | 'explore' | 'profile'
type IconName = ComponentProps<typeof Ionicons>['name']

const colors = {
  ink: '#151712',
  muted: '#73776d',
  paper: '#f4f5ef',
  white: '#ffffff',
  lime: '#d9ff5a',
  blue: '#5c78ff',
  pink: '#ff8fa4',
  line: '#dedfd7',
}

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Clubs', icon: 'people-outline' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
  { id: 'activity', label: 'Track', icon: 'navigate-outline' },
  { id: 'feed', label: 'Feed', icon: 'heart-outline' },
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'profile', label: 'Me', icon: 'person-outline' },
]

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

function ScreenHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {action}
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.32) }]}>{initials}</Text>
    </View>
  )
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <Pressable onPress={onPress}><Text style={styles.textLink}>{action}</Text></Pressable>}
    </View>
  )
}

function ClubCard({ club, miles, joined, onPress }: { club: Club; miles: number; joined: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.clubCard}>
      <Image source={{ uri: club.image }} style={styles.clubImage} />
      <View style={styles.clubImageShade} />
      <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{club.category.toUpperCase()}</Text></View>
      {joined && <View style={styles.joinedBadge}><AppIcon name="checkmark" size={13} /><Text style={styles.joinedBadgeText}>Joined</Text></View>}
      <View style={styles.clubCardBody}>
        <Text style={styles.clubName}>{club.name}</Text>
        <Text style={styles.clubMission} numberOfLines={2}>{club.mission}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}><AppIcon name="people-outline" size={14} color={colors.muted} />  {club.members.toLocaleString()} members</Text>
          <Text style={styles.metaText}><AppIcon name="location-outline" size={14} color={colors.muted} />  {miles} mi</Text>
        </View>
      </View>
    </Pressable>
  )
}

function TripCard({ trip, onPress, reserved }: { trip: Trip; onPress: () => void; reserved: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.tripCard}>
      <Image source={{ uri: trip.image }} style={styles.tripImage} />
      <View style={styles.tripInfo}>
        <View style={styles.tripTopLine}>
          <Text style={styles.eyebrow}>{trip.shortDay.toUpperCase()} · {trip.shortDate}</Text>
          {reserved && <Text style={styles.reservedLabel}>RESERVED</Text>}
        </View>
        <Text style={styles.tripName}>{trip.title}</Text>
        <Text style={styles.tripMeta}>{trip.time} · {trip.location}</Text>
        <Text style={styles.tripClub}>{trip.club}</Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

function PostCard({
  post,
  onLike,
  onSave,
  onComments,
}: {
  post: Post
  onLike: () => void
  onSave: () => void
  onComments: () => void
}) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postAuthorRow}>
        <Avatar name={post.author} size={40} />
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthor}>{post.author}{post.mine ? '  ·  You' : ''}</Text>
          <Text style={styles.postSubline}>{post.club ? `${post.club} · ` : ''}{post.time}</Text>
        </View>
        <Pressable accessibilityLabel="More post options" hitSlop={8}><AppIcon name="ellipsis-horizontal" color={colors.muted} /></Pressable>
      </View>
      {!!post.text && <Text style={styles.postText}>{post.text}</Text>}
      {!!post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
      {!!post.location && <Text style={styles.postLocation}><AppIcon name="location-outline" size={14} color={colors.muted} />  {post.location}</Text>}
      <View style={styles.postActions}>
        <Pressable onPress={onLike} style={styles.postAction} accessibilityRole="button" accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}>
          <AppIcon name={post.liked ? 'heart' : 'heart-outline'} color={post.liked ? '#e9516c' : colors.ink} />
          <Text style={styles.postActionText}>{post.likes}</Text>
        </Pressable>
        <Pressable onPress={onComments} style={styles.postAction} accessibilityLabel="View comments">
          <AppIcon name="chatbubble-outline" />
          <Text style={styles.postActionText}>{post.comments.length}</Text>
        </Pressable>
        <View style={styles.postActionSpacer} />
        <Pressable onPress={onSave} accessibilityLabel={post.saved ? 'Unsave post' : 'Save post'}>
          <AppIcon name={post.saved ? 'bookmark' : 'bookmark-outline'} color={post.saved ? colors.blue : colors.ink} />
        </Pressable>
      </View>
      {!!post.comments.length && (
        <Pressable onPress={onComments} style={styles.commentPreview}>
          <Text style={styles.commentPreviewText} numberOfLines={2}>
            <Text style={styles.commentAuthor}>{post.comments[post.comments.length - 1].author} </Text>
            {post.comments[post.comments.length - 1].text}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

export default function NativeApp() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('home')
  const [zipInput, setZipInput] = useState('90027')
  const [zip, setZip] = useState('90027')
  const [category, setCategory] = useState<'All' | Category>('All')
  const [search, setSearch] = useState('')
  const [joined, setJoined] = useState<string[]>(['club-0'])
  const [scheduleIds, setScheduleIds] = useState(['t1', 't3', 't4', 't6'])
  const [reserved, setReserved] = useState(['t3', 't6'])
  const [posts, setPosts] = useState<Post[]>(seedPosts)
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftLocation, setDraftLocation] = useState('')
  const [draftImage, setDraftImage] = useState<string | undefined>()
  const [commentText, setCommentText] = useState('')
  const [activityStore, setActivityStore] = useState<ActivityStore>({ active: null, history: [], points: 0 })
  const [clock, setClock] = useState(Date.now())
  const [importedWorkouts, setImportedWorkouts] = useState<ImportedWorkout[]>([])
  const [healthProvider, setHealthProvider] = useState<string | null>(null)
  const [syncingHealth, setSyncingHealth] = useState(false)

  useEffect(() => {
    Promise.all([getActivityStore(), loadImportedWorkouts(), loadHealthProvider()])
      .then(([savedActivities, savedWorkouts, savedProvider]) => {
        setActivityStore(savedActivities)
        setImportedWorkouts(savedWorkouts)
        setHealthProvider(savedProvider)
      })
      .catch((error: unknown) => {
        Alert.alert('Unable to load activity data', error instanceof Error ? error.message : 'Please restart the app and try again.')
      })
  }, [])

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

  const areaZip = areas[zip] ? zip : Object.keys(areas).sort(
    (a, b) => Math.abs(Number(a) - Number(zip)) - Math.abs(Number(b) - Number(zip)),
  )[0]
  const area = areas[areaZip]
  const visibleClubs = useMemo(
    () => clubs
      .filter((club) => club.zip === areaZip)
      .filter((club) => category === 'All' || club.category === category)
      .filter((club) => club.name.toLowerCase().includes(search.toLowerCase())),
    [areaZip, category, search],
  )
  const scheduleTrips = scheduleIds.map((id) => tripById(id)).filter((trip): trip is Trip => !!trip)
  const commentsPost = posts.find((post) => post.id === commentsPostId) ?? null
  const savedPosts = posts.filter((post) => post.saved)
  const myPosts = posts.filter((post) => post.mine)
  const activeDuration = activityStore.active
    ? activityStore.active.elapsedSeconds + (
      activityStore.active.status === 'recording'
        ? Math.max(0, Math.floor((clock - (activityStore.active.segmentStartedAt ?? clock)) / 1000))
        : 0
    )
    : 0

  const runActivityAction = async (action: () => Promise<unknown>, successMessage?: string) => {
    try {
      const completed = await action()
      setActivityStore(await getActivityStore())
      if (completed && typeof completed === 'object' && 'earnedPoints' in completed) {
        Alert.alert('Activity complete!', `You earned ${(completed as { earnedPoints: number }).earnedPoints} points. Great work!`)
      } else if (successMessage) {
        Alert.alert('Activity tracker', successMessage)
      }
    } catch (error) {
      Alert.alert('Activity tracker', error instanceof Error ? error.message : 'The activity could not be updated.')
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
      Alert.alert('Fitness data connected', `Imported ${workouts.length} recent workout${workouts.length === 1 ? '' : 's'} from ${provider}.`)
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
    } catch (error) {
      Alert.alert('Could not disconnect', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const toggleJoin = (id: string) => {
    setJoined((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const toggleSchedule = (trip: Trip) => {
    setScheduleIds((current) => current.includes(trip.id) ? current.filter((id) => id !== trip.id) : [...current, trip.id])
  }
  const toggleLike = (postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
      : post))
  }
  const toggleSave = (postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, saved: !post.saved } : post))
  }
  const addComment = () => {
    const text = commentText.trim()
    if (!text || !commentsPostId) return
    setPosts((current) => current.map((post) => post.id === commentsPostId
      ? { ...post, comments: [...post.comments, { id: `comment-${Date.now()}`, author: ME.name, mine: true, text, time: 'Just now', likes: 0, liked: false }] }
      : post))
    setCommentText('')
  }
  const closeComposer = () => {
    setComposing(false)
    setDraftText('')
    setDraftLocation('')
    setDraftImage(undefined)
  }
  const submitPost = () => {
    if (!draftText.trim() && !draftImage) return
    const post: Post = {
      id: `post-${Date.now()}`,
      author: ME.name,
      handle: ME.handle,
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
    closeComposer()
    setTab('feed')
  }
  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to attach an image to your post.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      })
      if (!result.canceled) setDraftImage(result.assets[0]?.uri)
    } catch (error) {
      Alert.alert('Unable to open photos', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="COMMUNITY" title="Find your people." action={
        <Pressable style={styles.roundAction} onPress={() => setTab('profile')} accessibilityLabel="Open profile">
          <AppIcon name="person-outline" />
        </Pressable>
      } />
      <View style={styles.searchBox}>
        <AppIcon name="search-outline" color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search clubs" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
      </View>
      <View style={styles.zipRow}>
        <View style={styles.zipInputBox}>
          <AppIcon name="location-outline" color={colors.muted} />
          <TextInput
            value={zipInput}
            onChangeText={(text) => setZipInput(text.replace(/\D/g, '').slice(0, 5))}
            placeholder="ZIP code"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={5}
            style={styles.zipInput}
            accessibilityLabel="ZIP code"
          />
        </View>
        <Pressable style={styles.searchButton} onPress={() => {
          if (/^\d{5}$/.test(zipInput)) {
            setZip(zipInput)
            setCategory('All')
          } else {
            Alert.alert('Check your ZIP code', 'Enter a 5-digit ZIP code to search nearby clubs.')
          }
        }}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>
      <View style={styles.locationBanner}>
        <AppIcon name="navigate-outline" color={colors.ink} />
        <Text style={styles.locationBannerText}>{area.city}, {area.state}<Text style={styles.mutedText}> · {visibleClubs.length} clubs</Text></Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
        {categories.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>
      {visibleClubs.map((club) => (
        <ClubCard key={club.id} club={club} miles={distanceFor(club, zip)} joined={joined.includes(club.id)} onPress={() => setSelectedClub(club)} />
      ))}
      {!visibleClubs.length && <Text style={styles.emptyText}>No clubs match that search. Try another activity or ZIP code.</Text>}
    </ScrollView>
  )

  const renderSchedule = () => (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <ScreenHeader eyebrow="YOUR OUTDOOR LIFE" title="Schedule" />
      <View style={styles.highlightCard}>
        <Text style={styles.highlightEyebrow}>UP NEXT</Text>
        <Text style={styles.highlightTitle}>{scheduleTrips[0]?.title ?? 'Make a plan outdoors'}</Text>
        <Text style={styles.highlightBody}>{scheduleTrips[0] ? `${scheduleTrips[0].shortDay}, ${scheduleTrips[0].shortDate} · ${scheduleTrips[0].time}` : 'Explore clubs and add an event to your schedule.'}</Text>
      </View>
      <View style={styles.scheduleTrackerCard}>
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
        <View style={styles.healthDivider} />
        <View style={styles.healthConnectRow}>
          <View style={styles.healthConnectCopy}>
            <Text style={styles.healthConnectTitle}>{Platform.OS === 'ios' ? 'Apple Health' : Platform.OS === 'android' ? 'Health Connect' : 'Fitness app sync'}</Text>
            <Text style={styles.healthConnectSub}>
              {healthProvider ? `${healthProvider} · ${importedWorkouts.length} workouts synced` : 'Import workouts, distance, calories, and heart rate.'}
            </Text>
          </View>
          {healthProvider ? (
            <Pressable onPress={connectHealthProvider} disabled={syncingHealth} style={styles.healthConnectButton}>
              <Text style={styles.healthConnectButtonText}>{syncingHealth ? 'Syncing…' : 'Sync'}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={connectHealthProvider} disabled={syncingHealth || Platform.OS === 'web'} style={[styles.healthConnectButton, (syncingHealth || Platform.OS === 'web') && styles.disabledAction]}>
              <Text style={styles.healthConnectButtonText}>{syncingHealth ? 'Connecting…' : 'Connect'}</Text>
            </Pressable>
          )}
        </View>
        {!!healthProvider && <Pressable onPress={disconnectHealthProvider} style={styles.disconnectButton}><Text style={styles.disconnectText}>Disconnect sync</Text></Pressable>}
        {Platform.OS === 'web' && <Text style={styles.webHealthNote}>Fitness app connections require the iOS or Android app.</Text>}
        <Text style={styles.healthPrivacyNote}>Only completed workout summaries are imported. Manage source apps and permissions in {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}.</Text>
      </View>
      {!!importedWorkouts.length && (
        <>
          <SectionTitle title="Synced workouts" />
          {importedWorkouts.slice(0, 3).map((workout) => (
            <View key={workout.id} style={styles.syncedWorkoutRow}>
              <View style={styles.syncedWorkoutIcon}><AppIcon name="fitness" size={17} /></View>
              <View style={styles.syncedWorkoutCopy}>
                <Text style={styles.syncedWorkoutTitle} numberOfLines={1}>{workout.title}</Text>
                <Text style={styles.syncedWorkoutSub}>{workout.source} · {new Date(workout.startedAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.syncedWorkoutDistance}>{workout.distanceMeters ? `${(workout.distanceMeters / 1609.344).toFixed(1)} mi` : `${Math.round(workout.durationSeconds / 60)} min`}</Text>
            </View>
          ))}
        </>
      )}
      <SectionTitle title="Upcoming events" action="Explore" onPress={() => setTab('explore')} />
      {scheduleTrips.map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => setSelectedTrip(trip)} />)}
      <SectionTitle title="Discover events" />
      {trips.filter((trip) => !scheduleIds.includes(trip.id)).slice(0, 4).map((trip) => (
        <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => setSelectedTrip(trip)} />
      ))}
    </ScrollView>
  )

  const renderFeed = () => (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <ScreenHeader eyebrow="THE COMMUNITY" title="Outside feed" action={
        <Pressable style={styles.roundAction} onPress={() => { setDraftText(''); setDraftImage(undefined); setComposing(true) }} accessibilityLabel="Create a post">
          <AppIcon name="add" />
        </Pressable>
      } />
      <Pressable style={styles.composePrompt} onPress={() => setComposing(true)}>
        <Avatar name={ME.name} size={38} />
        <Text style={styles.composePromptText}>What's happening outside?</Text>
        <View style={styles.composePlus}><AppIcon name="add" size={18} /></View>
      </Pressable>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => toggleLike(post.id)}
          onSave={() => toggleSave(post.id)}
          onComments={() => setCommentsPostId(post.id)}
        />
      ))}
    </ScrollView>
  )

  const renderExplore = () => (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <ScreenHeader eyebrow="GET INSPIRED" title="Explore" />
      <View style={styles.exploreIntro}>
        <Text style={styles.exploreIntroTitle}>A little more outside.</Text>
        <Text style={styles.exploreIntroText}>Find your next favorite place, activity, or crew.</Text>
      </View>
      <SectionTitle title="Upcoming near you" action="Schedule" onPress={() => setTab('schedule')} />
      {trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} reserved={reserved.includes(trip.id)} onPress={() => setSelectedTrip(trip)} />)}
      <SectionTitle title="Community moments" />
      <View style={styles.mediaGrid}>
        {media.map((item) => (
          <Pressable key={item.id} style={styles.mediaTile} onPress={() => setTab('feed')}>
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

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <ScreenHeader eyebrow="YOUR OUTDOOR LIFE" title="Profile" />
      <View style={styles.profileCard}>
        <Avatar name={ME.name} size={76} />
        <Text style={styles.profileName}>{ME.name}</Text>
        <Text style={styles.profileHandle}>@{ME.handle}</Text>
        <Text style={styles.profileBio}>Finding good trails, good people, and reasons to stay outside.</Text>
        <View style={styles.profileStats}>
          <View><Text style={styles.profileStatValue}>{joined.length}</Text><Text style={styles.profileStatLabel}>Clubs</Text></View>
          <View><Text style={styles.profileStatValue}>{scheduleIds.length}</Text><Text style={styles.profileStatLabel}>Events</Text></View>
          <View><Text style={styles.profileStatValue}>{myPosts.length}</Text><Text style={styles.profileStatLabel}>Posts</Text></View>
        </View>
      </View>
      <SectionTitle title="Your clubs" />
      {joined.map((id) => {
        const club = clubById(id)
        return <Pressable key={id} style={styles.simpleRow} onPress={() => setSelectedClub(club)}>
          <Avatar name={club.name} size={42} />
          <View style={styles.simpleRowCopy}><Text style={styles.simpleRowTitle}>{club.name}</Text><Text style={styles.simpleRowSub}>{club.category} · {club.members.toLocaleString()} members</Text></View>
          <AppIcon name="chevron-forward" color={colors.muted} />
        </Pressable>
      })}
      <SectionTitle title="Saved posts" />
      {savedPosts.map((post) => <PostCard key={post.id} post={post} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} onComments={() => setCommentsPostId(post.id)} />)}
      {myPosts.length > 0 && <SectionTitle title="Your posts" />}
      {myPosts.map((post) => <PostCard key={post.id} post={post} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} onComments={() => setCommentsPostId(post.id)} />)}
    </ScrollView>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.appBody}>
        {tab === 'home' && renderHome()}
        {tab === 'schedule' && renderSchedule()}
        {tab === 'activity' && (
          <ActivityScreen
            store={activityStore}
            elapsedSeconds={activeDuration}
            onStart={(kind: ActivityKind) => { void runActivityAction(() => beginActivity(kind)) }}
            onPause={() => { void runActivityAction(pauseActivity) }}
            onResume={() => { void runActivityAction(resumeActivity) }}
            onFinish={() => { void runActivityAction(finishActivity) }}
          />
        )}
        {tab === 'feed' && renderFeed()}
        {tab === 'explore' && renderExplore()}
        {tab === 'profile' && renderProfile()}
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <Pressable key={item.id} style={styles.tabButton} onPress={() => setTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item.label}>
              <AppIcon name={item.icon} size={22} color={active ? colors.ink : colors.muted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          )
        })}
      </View>

      <Modal visible={!!selectedClub} animationType="slide" onRequestClose={() => setSelectedClub(null)}>
        {selectedClub && <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalImageWrap}>
              <Image source={{ uri: selectedClub.image }} style={styles.modalHeroImage} />
              <Pressable style={styles.closeButton} onPress={() => setSelectedClub(null)} accessibilityLabel="Close club">
                <AppIcon name="close" color={colors.white} />
              </Pressable>
              <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{selectedClub.category.toUpperCase()}</Text></View>
            </View>
            <View style={styles.modalPadding}>
              <Text style={styles.modalTitle}>{selectedClub.name}</Text>
              <Text style={styles.modalSub}>{areas[selectedClub.zip]?.city}, {areas[selectedClub.zip]?.state} · {selectedClub.members.toLocaleString()} members</Text>
              <Text style={styles.sectionTitle}>Our mission</Text>
              <Text style={styles.bodyText}>{selectedClub.mission}</Text>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bodyText}>{selectedClub.about}</Text>
              <View style={styles.detailInfo}><AppIcon name="calendar-outline" color={colors.muted} /><Text style={styles.bodyText}>{selectedClub.meets}</Text></View>
              <Pressable style={[styles.primaryButton, joined.includes(selectedClub.id) && styles.secondaryButton]} onPress={() => toggleJoin(selectedClub.id)}>
                <AppIcon name={joined.includes(selectedClub.id) ? 'checkmark' : 'add'} color={colors.ink} />
                <Text style={styles.primaryButtonText}>{joined.includes(selectedClub.id) ? 'Joined' : 'Join club'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>}
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
                <Avatar name={comment.author} size={34} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
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
              <Pressable onPress={closeComposer}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Text style={styles.sheetTitle}>New post</Text>
              <Pressable onPress={submitPost} disabled={!draftText.trim() && !draftImage} style={[styles.postButton, !draftText.trim() && !draftImage && styles.disabledButton]}>
                <Text style={styles.postButtonText}>Post</Text>
              </Pressable>
            </View>
            <View style={styles.composeAuthor}>
              <Avatar name={ME.name} size={42} />
              <View><Text style={styles.postAuthor}>{ME.name}</Text><Text style={styles.postSubline}>Share with the community</Text></View>
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
            <Pressable onPress={pickImage} style={styles.addPhotoButton}>
              <AppIcon name="image-outline" color={colors.blue} />
              <Text style={styles.addPhotoText}>{draftImage ? 'Change photo' : 'Add photo'}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  appBody: { flex: 1 },
  screenContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 },
  screenHeading: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  screenTitle: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -1.1 },
  roundAction: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white, borderRadius: 15, paddingHorizontal: 13, height: 48, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 0 },
  zipRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  zipInputBox: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, height: 46 },
  zipInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 0 },
  searchButton: { backgroundColor: colors.ink, minWidth: 78, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  locationBanner: { backgroundColor: '#e8eadf', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  locationBannerText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  mutedText: { color: colors.muted, fontWeight: '500' },
  chipList: { gap: 7, paddingBottom: 15 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.ink, fontWeight: '600', fontSize: 12 },
  chipTextSelected: { fontWeight: '800' },
  clubCard: { backgroundColor: colors.white, borderRadius: 23, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: colors.line },
  clubImage: { width: '100%', height: 168, backgroundColor: '#d7dbcf' },
  clubImageShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 168, backgroundColor: '#00000016' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 },
  categoryBadgeText: { color: colors.ink, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  joinedBadge: { position: 'absolute', top: 11, right: 11, backgroundColor: colors.lime, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  clubCardBody: { padding: 14 },
  clubName: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 5 },
  clubMission: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metaText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  avatar: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '800' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  textLink: { color: colors.ink, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  highlightCard: { backgroundColor: colors.ink, borderRadius: 23, padding: 19, marginBottom: 14 },
  highlightEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  highlightTitle: { color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '800', marginTop: 9 },
  highlightBody: { color: '#e2e5dc', fontSize: 12, lineHeight: 18, marginTop: 7 },
  scheduleTrackerCard: { backgroundColor: '#f0f2e9', borderRadius: 19, padding: 13, marginBottom: 17, borderWidth: 1, borderColor: colors.line },
  scheduleTrackerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleTrackerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  scheduleTrackerCopy: { flex: 1 },
  scheduleTrackerTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  scheduleTrackerSub: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  scheduleTrackButton: { backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
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
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 19, padding: 10, marginBottom: 10 },
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
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  tabLabel: { color: colors.muted, fontSize: 9, fontWeight: '600' },
  tabLabelActive: { color: colors.ink, fontWeight: '800' },
  tabIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink, position: 'absolute', top: -1 },
  modalSafe: { flex: 1, backgroundColor: colors.paper },
  modalScroll: { paddingBottom: 24 },
  modalImageWrap: { height: 250, position: 'relative', backgroundColor: '#d7dbcf' },
  modalHeroImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 16, right: 16, width: 38, height: 38, borderRadius: 20, backgroundColor: '#151712aa', alignItems: 'center', justifyContent: 'center' },
  modalPadding: { paddingHorizontal: 19, paddingTop: 19, paddingBottom: 12 },
  modalTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '800', marginTop: 3 },
  modalSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  bodyText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  detailInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 13 },
  detailNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14, padding: 12, backgroundColor: '#e9ebdf', borderRadius: 12 },
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
