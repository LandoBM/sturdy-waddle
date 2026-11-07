import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback, useMemo, useState, type ComponentProps } from 'react'
import { useColorScheme } from 'nativewind'
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { Post } from '../src/posts'

type IconName = ComponentProps<typeof Ionicons>['name']

type FeedScreenProps = {
  posts: Post[]
  profileAvatarUrl?: string | null
  refreshing: boolean
  loading?: boolean
  error?: string
  onRefresh: () => void
  onOpenNotifications: () => void
  hasUnreadNotifications: boolean
  onCompose: () => void
  onLike: (postId: string) => void
  onSave: (postId: string) => void
  onComments: (postId: string) => void
  followedHandles: string[]
  onToggleFollow: (handle: string) => void
  darkMode?: boolean
}

const palette = {
  orange: '#FF7900',
  darkBackground: '#080B09',
  darkSurface: '#171C19',
  darkBorder: '#2B332D',
  lightBackground: '#F5F6F2',
  lightSurface: '#FFFFFF',
  lightBorder: '#E7EAE4',
  mutedDark: '#A9B3A9',
  mutedLight: '#68736B',
}

function Avatar({ name, photoUri, size = 42 }: { name: string; photoUri?: string | null; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'FH'
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}> 
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: Math.max(12, size * 0.3) }]}>{initials}</Text>
      )}
    </View>
  )
}

function Icon({ name, color, size = 21 }: { name: IconName; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

type PostCardProps = {
  post: Post
  photoUri?: string | null
  dark: boolean
  following: boolean
  onLike: () => void
  onSave: () => void
  onComments: () => void
  onToggleFollow: () => void
}

export const PostCard = memo(function PostCard({
  post, photoUri, dark, following, onLike, onSave, onComments, onToggleFollow,
}: PostCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? palette.mutedDark : palette.mutedLight

  const openOptions = () => {
    Alert.alert('Post options', `@${post.handle}`, [
      { text: 'Share post', onPress: () => { void Share.share({ message: [post.text, post.image].filter(Boolean).join('\n') || `Post by @${post.handle}` }).catch(() => Alert.alert('Unable to share', 'Please try again.')) } },
      { text: post.saved ? 'Remove from saved' : 'Save post', onPress: onSave },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <View style={[styles.card, { backgroundColor: dark ? palette.darkSurface : palette.lightSurface, borderColor: dark ? palette.darkBorder : palette.lightBorder }]}> 
      <View style={styles.authorRow}>
        <Avatar name={post.handle} size={44} photoUri={post.mine ? photoUri : post.avatarUrl} />
        <View style={styles.authorCopy}>
          <Text style={[styles.handle, { color: foreground }]} numberOfLines={1}>@{post.handle}{post.mine ? ' · You' : ''}</Text>
          <Text style={[styles.meta, { color: muted }]} numberOfLines={1}>{[post.club, post.time].filter(Boolean).join(' · ')}</Text>
        </View>
        {!post.mine && (
          <Pressable
            onPress={onToggleFollow}
            style={[styles.followButton, { backgroundColor: following ? 'transparent' : '#FF790020', borderColor: following ? (dark ? '#596359' : '#C7CFC6') : palette.orange }]}
            accessibilityRole="button"
            accessibilityLabel={`${following ? 'Unfollow' : 'Follow'} @${post.handle}`}
          >
            <Text style={[styles.followText, { color: following ? foreground : palette.orange }]}>{following ? 'Following' : 'Follow'}</Text>
          </Pressable>
        )}
        <Pressable onPress={openOptions} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Post options">
          <Icon name="ellipsis-horizontal" color={muted} size={22} />
        </Pressable>
      </View>

      {!!post.text && <Text style={[styles.postText, { color: foreground }]}>{post.text}</Text>}

      {!!post.image && !imageFailed && (
        <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" onError={() => setImageFailed(true)} />
      )}
      {!!post.image && imageFailed && (
        <View style={[styles.imageFallback, { backgroundColor: dark ? '#242A25' : '#EEF0EB' }]}> 
          <Icon name="image-outline" color={muted} size={30} />
          <Text style={[styles.meta, { color: muted }]}>Image unavailable</Text>
        </View>
      )}

      {!!post.location && (
        <View style={styles.locationRow}>
          <Icon name="location-outline" color={palette.orange} size={15} />
          <Text style={[styles.locationText, { color: muted }]} numberOfLines={1}>{post.location}</Text>
        </View>
      )}

      <View style={[styles.actions, { borderTopColor: dark ? palette.darkBorder : palette.lightBorder }]}> 
        <Pressable onPress={onLike} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}>
          <Icon name={post.liked ? 'heart' : 'heart-outline'} color={post.liked ? palette.orange : foreground} size={23} />
          <Text style={[styles.actionCount, { color: foreground }]}>{post.likes}</Text>
        </Pressable>
        <Pressable onPress={onComments} style={styles.actionButton} accessibilityRole="button" accessibilityLabel="View comments">
          <Icon name="chatbubble-outline" color={foreground} size={21} />
          <Text style={[styles.actionCount, { color: foreground }]}>{post.comments.length}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onSave} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={post.saved ? 'Unsave post' : 'Save post'}>
          <Icon name={post.saved ? 'bookmark' : 'bookmark-outline'} color={post.saved ? palette.orange : foreground} size={23} />
        </Pressable>
      </View>

      {post.comments.length > 0 && (
        <Pressable onPress={onComments} style={styles.commentPreview} accessibilityRole="button" accessibilityLabel="Open latest comment">
          <Text style={[styles.commentText, { color: muted }]} numberOfLines={2}>
            <Text style={{ color: foreground, fontWeight: '800' }}>@{post.comments[post.comments.length - 1].handle} </Text>
            {post.comments[post.comments.length - 1].text}
          </Text>
        </Pressable>
      )}
    </View>
  )
})

export function FeedScreen({
  posts, profileAvatarUrl, refreshing, loading = false, error = '', onRefresh, onOpenNotifications,
  hasUnreadNotifications, onCompose, onLike, onSave, onComments,
  followedHandles, onToggleFollow, darkMode,
}: FeedScreenProps) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? palette.mutedDark : palette.mutedLight
  const background = dark ? palette.darkBackground : palette.lightBackground
  const followedSet = useMemo(() => new Set(followedHandles.map((handle) => handle.replace(/^@/, '').toLowerCase())), [followedHandles])

  const header = useMemo(() => (
    <View style={styles.headerArea}>
      <View style={styles.headerRow}>
        <View style={styles.headerSide} />
        <View style={styles.brandRow}>
          <Text style={[styles.wordmark, { color: foreground }]}>FitHive</Text>
          <Text style={styles.brandDot}>.</Text>
        </View>
        <View style={[styles.headerSide, styles.headerActions]}>
          <Pressable onPress={onOpenNotifications} style={[styles.headerIcon, { backgroundColor: dark ? '#252C26' : '#FFFFFF' }]} accessibilityRole="button" accessibilityLabel="Open notifications">
            <Icon name="notifications-outline" color={foreground} size={22} />
            {hasUnreadNotifications && <View style={styles.unreadDot} />}
          </Pressable>
          <Pressable onPress={onCompose} style={[styles.headerIcon, { backgroundColor: palette.orange }]} accessibilityRole="button" accessibilityLabel="Create a post">
            <Icon name="add" color="#FFFFFF" size={27} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.heading, { color: foreground }]}>Your community.</Text>
      <Text style={[styles.subheading, { color: muted }]}>Every adventure is better together.</Text>
      {loading && <View style={styles.loadingRow}><ActivityIndicator color={palette.orange} /><Text style={[styles.meta, { color: muted }]}>Refreshing your community…</Text></View>}
      {!!error && <View style={[styles.errorCard, { backgroundColor: dark ? '#2A1814' : '#FFF1EC', borderColor: dark ? '#6C3424' : '#FFC5B2' }]}><Text style={[styles.errorText, { color: dark ? '#FFD0C0' : '#9D351B' }]}>{error}</Text><Pressable onPress={onRefresh} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry loading feed"><Text style={styles.retryText}>Retry</Text></Pressable></View>}
    </View>
  ), [dark, foreground, muted, hasUnreadNotifications, onOpenNotifications, onCompose, loading, error, onRefresh])

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      photoUri={profileAvatarUrl}
      dark={dark}
      following={followedSet.has(item.handle.replace(/^@/, '').toLowerCase())}
      onLike={() => onLike(item.id)}
      onSave={() => onSave(item.id)}
      onComments={() => onComments(item.id)}
      onToggleFollow={() => onToggleFollow(item.handle)}
    />
  ), [profileAvatarUrl, dark, followedSet, onLike, onSave, onComments, onToggleFollow])

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <FlatList
      style={{ flex: 1, backgroundColor: background }}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading
          ? <View style={[styles.emptyCard, { backgroundColor: dark ? palette.darkSurface : '#FFFFFF', borderColor: dark ? palette.darkBorder : palette.lightBorder }]}><ActivityIndicator color={palette.orange} /><Text style={[styles.emptyBody, { color: muted }]}>Loading your community…</Text></View>
          : <View style={[styles.emptyCard, { backgroundColor: dark ? palette.darkSurface : '#FFFFFF', borderColor: dark ? palette.darkBorder : palette.lightBorder }]}>
            <Icon name="people-outline" color={palette.orange} size={35} />
            <Text style={[styles.emptyTitle, { color: foreground }]}>Your next adventure starts here.</Text>
            <Text style={[styles.emptyBody, { color: muted }]}>Discover activities, follow other members, or create your first post.</Text>
            <Pressable onPress={onCompose} style={styles.emptyButton} accessibilityRole="button" accessibilityLabel="Create your first post">
              <Icon name="add" color="#FFFFFF" size={20} />
              <Text style={styles.emptyButtonText}>Create a post</Text>
            </Pressable>
          </View>
      }
      contentContainerStyle={[styles.listContent, { backgroundColor: background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.orange} colors={[palette.orange]} />}
      initialNumToRender={5}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 32, flexGrow: 1 },
  headerArea: { marginBottom: 22 },
  headerRow: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerSide: { width: 104 },
  headerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flex: 1 },
  wordmark: { fontSize: 28, fontFamily: 'Exo2_800ExtraBold_Italic', letterSpacing: -1.4 },
  brandDot: { color: palette.orange, fontSize: 30, fontWeight: '900' },
  unreadDot: { position: 'absolute', right: 9, top: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: palette.orange, borderWidth: 1.5, borderColor: '#FFFFFF' },
  heading: { fontSize: 27, fontWeight: '800', letterSpacing: -0.9 },
  subheading: { fontSize: 13, marginTop: 5 },
  card: { borderRadius: 24, borderWidth: 1, padding: 15, marginBottom: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FFBD7B' },
  avatarInitials: { fontWeight: '800', color: '#171C19' },
  authorCopy: { flex: 1, minWidth: 0 },
  handle: { fontSize: 13, fontWeight: '800' },
  meta: { fontSize: 10, marginTop: 3 },
  followButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  followText: { fontSize: 11, fontWeight: '800' },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  postText: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  postImage: { width: '100%', aspectRatio: 1.45, borderRadius: 16, backgroundColor: '#343B34' },
  imageFallback: { width: '100%', aspectRatio: 1.45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  locationText: { fontSize: 11, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, marginTop: 15, paddingTop: 8 },
  actionButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 12, fontWeight: '700' },
  commentPreview: { marginTop: 4, paddingVertical: 5 },
  commentText: { fontSize: 11, lineHeight: 17 },
  emptyCard: { padding: 25, borderWidth: 1, borderRadius: 24, alignItems: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  emptyBody: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  emptyButton: { minHeight: 46, borderRadius: 24, backgroundColor: palette.orange, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, marginTop: 18 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  retryButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, backgroundColor: palette.orange },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
})
