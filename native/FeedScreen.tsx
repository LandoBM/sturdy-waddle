import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
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
import type { Comment, Post, PostTag } from '../src/posts'
import { MentionText } from './MentionText'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MentionInput } from './MentionInput'
import { BottomSheet } from './BottomSheet'

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
  unreadNotificationCount?: number
  feedMode: 'forYou' | 'following'
  onFeedModeChange: (mode: 'forYou' | 'following') => void
  onCompose: () => void
  onLike: (postId: string) => void
  onSave: (postId: string) => void
  onComments: (postId: string) => void
  onDelete: (postId: string) => void
  followedHandles: string[]
  onToggleFollow: (handle: string) => void
  onOpenProfile?: (profileId: string) => void
  onOpenClub?: (clubId: string) => void
  darkMode?: boolean
  client?: SupabaseClient | null
  commentsPostId?: string | null
  targetPostId?: string | null
  highlightedCommentId?: string | null
  commentText?: string
  commentTags?: PostTag[]
  commentFocusRequest?: number
  replyTo?: Comment | null
  onCommentTextChange?: (value: string) => void
  onCommentMentionSelected?: (tag: PostTag) => void
  onSubmitComment?: () => void
  onReply?: (comment: Comment) => void
  onCancelReply?: () => void
}

const palette = {
  orange: '#FF5A1F',
  darkBackground: '#090A0C',
  darkSurface: '#17191D',
  darkBorder: '#303238',
  lightBackground: '#F5F6F2',
  lightSurface: '#FFFFFF',
  lightBorder: '#E7EAE4',
  mutedDark: '#A1A1AA',
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
  onDelete?: () => void
  onToggleFollow: () => void
  onOpenProfile?: (profileId: string) => void
  onOpenClub?: (clubId: string) => void
  client?: SupabaseClient | null
  commentsExpanded?: boolean
  highlightedCommentId?: string | null
  commentText?: string
  commentTags?: PostTag[]
  commentFocusRequest?: number
  replyTo?: Comment | null
  onCommentTextChange?: (value: string) => void
  onCommentMentionSelected?: (tag: PostTag) => void
  onSubmitComment?: () => void
  onReply?: (comment: Comment) => void
  onCancelReply?: () => void
}

export const PostCard = memo(function PostCard({
  post, photoUri, dark, following, onLike, onSave, onComments, onDelete, onToggleFollow, onOpenProfile, onOpenClub,
  client, commentsExpanded = false, highlightedCommentId = null, commentText = '', commentTags = [], commentFocusRequest = 0, replyTo, onCommentTextChange, onCommentMentionSelected, onSubmitComment, onReply, onCancelReply,
}: PostCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [postSheet, setPostSheet] = useState<'menu' | 'delete' | null>(null)
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? palette.mutedDark : palette.mutedLight

  const renderComment = (comment: Comment, nested = false): ReactNode => {
    const replies = post.comments.filter((candidate) => candidate.parentId === comment.id)
    const repliesExpanded = expandedReplies.has(comment.id)
    return <View key={comment.id} style={[styles.inlineComment, nested && styles.inlineReply, highlightedCommentId === comment.id && styles.highlightedComment]}>
      <Avatar name={comment.author} size={nested ? 28 : 32} photoUri={comment.mine ? photoUri : null} />
      <View style={styles.commentCopy}>
        <View style={[styles.commentBubble, { backgroundColor: dark ? '#242A25' : '#F5F6F2', borderColor: dark ? palette.darkBorder : palette.lightBorder }]}>
          <Text style={[styles.commentAuthor, { color: foreground }]}>@{comment.handle}</Text>
          <MentionText text={comment.text} tags={comment.tags} color={foreground} onOpenProfile={onOpenProfile} onOpenClub={onOpenClub} style={styles.commentBody} />
        </View>
        <View style={styles.commentMetaRow}><Text style={[styles.commentTime, { color: muted }]}>{comment.time}</Text><Pressable onPress={() => onReply?.(comment)} accessibilityRole="button" accessibilityLabel={`Reply to @${comment.handle}`}><Text style={[styles.replyAction, { color: palette.orange }]}>Reply</Text></Pressable></View>
        {!!replies.length && <Pressable onPress={() => setExpandedReplies((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next })} accessibilityRole="button" accessibilityLabel={`${repliesExpanded ? 'Hide' : 'Show'} replies to @${comment.handle}`}><Text style={[styles.repliesToggle, { color: muted }]}>{repliesExpanded ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}</Text></Pressable>}
        {repliesExpanded && replies.map((reply) => renderComment(reply, true))}
      </View>
    </View>
  }

  const openOptions = () => {
    setPostSheet('menu')
  }

  const runSheetAction = (action: () => void) => { setPostSheet(null); action() }

  return (
    <>
    <View style={[styles.card, { backgroundColor: dark ? palette.darkSurface : palette.lightSurface, borderColor: dark ? palette.darkBorder : palette.lightBorder }]}> 
      <View style={styles.authorRow}>
        <Avatar name={post.handle} size={44} photoUri={post.displayAsClub ? post.clubAvatarUrl : post.mine ? photoUri : post.avatarUrl} />
        <View style={styles.authorCopy}>
          <Text style={[styles.handle, { color: foreground }]} numberOfLines={1}>@{post.handle}{post.mine && !post.displayAsClub ? ' · You' : ''}</Text>
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

      {!!post.text && <MentionText text={post.text} tags={post.tags} color={foreground} onOpenProfile={onOpenProfile} onOpenClub={onOpenClub} style={styles.postText} />}

      {!!post.tags?.length && <View style={styles.tagsRow}>
        <Icon name="pricetag-outline" color={palette.orange} size={14} />
        {post.tags.map((tag) => <Pressable key={tag.id} onPress={() => tag.kind === 'profile' && tag.profileId ? onOpenProfile?.(tag.profileId) : tag.clubId ? onOpenClub?.(tag.clubId) : undefined} style={[styles.tagChip, { backgroundColor: dark ? '#242A25' : '#FFF4EE' }]} accessibilityRole="button" accessibilityLabel={`Open tagged ${tag.kind === 'profile' ? 'profile' : 'club'} ${tag.label}`}><Text style={[styles.tagChipText, { color: palette.orange }]} numberOfLines={1}>{tag.kind === 'profile' ? `@${tag.handle || tag.label}` : tag.label}</Text></Pressable>)}
      </View>}

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

      {!!post.sharedClub && <Pressable onPress={() => onOpenClub?.(post.sharedClub!.id)} style={[styles.sharedClubCard, { backgroundColor: dark ? '#202823' : '#FFF4EE', borderColor: dark ? palette.darkBorder : '#FFD1B3' }]} accessibilityRole="button" accessibilityLabel={`View club ${post.sharedClub.name}`}>
        {post.sharedClub.coverImageUrl ? <Image source={{ uri: post.sharedClub.coverImageUrl }} style={styles.sharedClubImage} resizeMode="cover" /> : <View style={[styles.sharedClubFallback, { backgroundColor: dark ? '#2B211B' : '#FFE2CC' }]}><Text style={{ color: palette.orange, fontSize: 22, fontWeight: '900' }}>R</Text><Text style={{ color: palette.orange, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>ROAVA CLUB</Text></View>}
        <View style={styles.sharedClubCopy}><Text style={[styles.sharedClubName, { color: foreground }]} numberOfLines={1}>{post.sharedClub.name}</Text><Text style={[styles.sharedClubMeta, { color: muted }]} numberOfLines={1}>{[post.sharedClub.activity, post.sharedClub.location].filter(Boolean).join(' · ') || 'Community club'}</Text><Text style={[styles.sharedClubLevels, { color: palette.orange }]} numberOfLines={1}>{post.sharedClub.skillLevels.length ? post.sharedClub.skillLevels.map((level) => level.charAt(0).toUpperCase() + level.slice(1)).join(' · ') : 'Skill levels not specified'}</Text><Text style={[styles.sharedClubAction, { color: palette.orange }]}>View Club</Text></View>
      </Pressable>}

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
      {commentsExpanded && client && onCommentTextChange && onSubmitComment && (
        <View style={[styles.inlineComments, { borderTopColor: dark ? palette.darkBorder : palette.lightBorder }]}>
          <Text style={[styles.inlineCommentsTitle, { color: foreground }]}>Comments</Text>
          {!post.comments.filter((comment) => !comment.parentId).length && <Text style={[styles.noComments, { color: muted }]}>Be the first to comment.</Text>}
          {post.comments.filter((comment) => !comment.parentId).map((comment) => renderComment(comment))}
          {!!replyTo && <View style={[styles.replyingTo, { backgroundColor: dark ? '#242A25' : '#FFF4EE' }]}><Text style={[styles.replyingText, { color: foreground }]}>Replying to @{replyTo.handle}</Text><Pressable onPress={onCancelReply} accessibilityLabel="Cancel reply"><Text style={{ color: palette.orange, fontWeight: '800' }}>Cancel</Text></Pressable></View>}
          <View style={styles.inlineCommentInputRow}>
            <MentionInput client={client} value={commentText} onChangeText={(value) => onCommentTextChange(value.slice(0, 280))} onMentionSelected={(tag) => onCommentMentionSelected?.(tag)} dark={dark} focusRequest={commentFocusRequest} placeholder="Add a comment…" placeholderTextColor={muted} multiline maxLength={280} style={[styles.inlineCommentInput, { backgroundColor: dark ? '#171C19' : '#FFFFFF', borderColor: dark ? palette.darkBorder : palette.lightBorder }]} />
            <Pressable onPress={onSubmitComment} disabled={!commentText.trim()} style={[styles.inlineSendButton, { backgroundColor: palette.orange, opacity: commentText.trim() ? 1 : 0.45 }]} accessibilityLabel="Post comment"><Icon name="arrow-up" color="#FFFFFF" size={18} /></Pressable>
          </View>
        </View>
      )}
    </View>
    <BottomSheet visible={postSheet !== null} onClose={() => setPostSheet(null)} backgroundColor={dark ? palette.darkSurface : palette.lightSurface} borderColor={dark ? palette.darkBorder : palette.lightBorder} accessibilityLabel={postSheet === 'delete' ? 'Delete post confirmation' : 'Post options'}>
      <View style={styles.actionSheetContent}>
        <Text style={[styles.actionSheetTitle, { color: foreground }]}>{postSheet === 'delete' ? 'Delete post?' : 'Post options'}</Text>
        <Text style={[styles.actionSheetSubtitle, { color: muted }]}>{postSheet === 'delete' ? 'Are you sure you want to permanently delete this post? This action cannot be undone.' : `@${post.handle}`}</Text>
        {postSheet === 'menu' ? <>
          <Pressable style={[styles.actionSheetButton, { borderColor: dark ? palette.darkBorder : palette.lightBorder }]} onPress={() => runSheetAction(() => { void Share.share({ message: [post.text, post.image].filter(Boolean).join('\n') || `Post by @${post.handle}` }).catch(() => Alert.alert('Unable to share', 'Please try again.')) })}><Icon name="share-outline" color={foreground} /><Text style={[styles.actionSheetButtonText, { color: foreground }]}>Share post</Text></Pressable>
          <Pressable style={[styles.actionSheetButton, { borderColor: dark ? palette.darkBorder : palette.lightBorder }]} onPress={() => runSheetAction(onSave)}><Icon name="bookmark-outline" color={foreground} /><Text style={[styles.actionSheetButtonText, { color: foreground }]}>{post.saved ? 'Remove from saved' : 'Save post'}</Text></Pressable>
          {post.mine && onDelete && <Pressable style={[styles.actionSheetButton, { borderColor: dark ? palette.darkBorder : palette.lightBorder }]} onPress={() => setPostSheet('delete')}><Icon name="trash-outline" color="#B42318" /><Text style={[styles.actionSheetButtonText, { color: '#B42318' }]}>Delete post</Text></Pressable>}
        </> : <Pressable style={[styles.actionSheetButton, { borderColor: '#B42318' }]} onPress={() => runSheetAction(onDelete!)}><Icon name="trash-outline" color="#B42318" /><Text style={[styles.actionSheetButtonText, { color: '#B42318' }]}>Delete post</Text></Pressable>}
        <Pressable style={styles.actionSheetCancel} onPress={() => setPostSheet(null)}><Text style={[styles.actionSheetButtonText, { color: muted }]}>Cancel</Text></Pressable>
      </View>
    </BottomSheet>
    </>
  )
})

export function FeedScreen({
  posts, profileAvatarUrl, refreshing, loading = false, error = '', onRefresh, onOpenNotifications,
  hasUnreadNotifications, unreadNotificationCount = 0, onCompose, onLike, onSave, onComments, onDelete,
  followedHandles, onToggleFollow, feedMode, onFeedModeChange, darkMode,
  onOpenProfile, onOpenClub,
  client, commentsPostId, targetPostId, highlightedCommentId, commentText, commentTags, commentFocusRequest, replyTo, onCommentTextChange, onCommentMentionSelected, onSubmitComment, onReply, onCancelReply,
}: FeedScreenProps) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? palette.mutedDark : palette.mutedLight
  const background = dark ? palette.darkBackground : palette.lightBackground
  const followedSet = useMemo(() => new Set(followedHandles.map((handle) => handle.replace(/^@/, '').toLowerCase())), [followedHandles])
  const listRef = useRef<any>(null)

  useEffect(() => {
    if (!targetPostId) return
    const index = posts.findIndex((post) => post.id === targetPostId)
    if (index < 0) return
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 }), 120)
    return () => clearTimeout(timer)
  }, [posts, targetPostId])

  const header = useMemo(() => (
    <View style={styles.headerArea}>
      <View style={styles.headerRow}>
        <View style={styles.headerSide} />
        <View style={styles.brandRow}>
          <Text style={[styles.wordmark, { color: foreground }]}>Roava</Text>
          <Text style={styles.brandDot}>.</Text>
        </View>
        <View style={[styles.headerSide, styles.headerActions]}>
          <Pressable onPress={onOpenNotifications} style={[styles.headerIcon, { backgroundColor: dark ? '#252C26' : '#FFFFFF' }]} accessibilityRole="button" accessibilityLabel="Open notifications">
            <Icon name="notifications-outline" color={foreground} size={22} />
            {hasUnreadNotifications && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text></View>}
          </Pressable>
          <Pressable onPress={onCompose} style={[styles.headerIcon, { backgroundColor: palette.orange }]} accessibilityRole="button" accessibilityLabel="Create a post">
            <Icon name="add" color="#FFFFFF" size={27} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.feedModeControl, { backgroundColor: dark ? '#17191D' : '#FFFFFF', borderColor: dark ? '#303238' : '#E7EAE4' }]} accessibilityRole="tablist">
        {([['forYou', 'For You'], ['following', 'Following']] as const).map(([mode, label]) => <Pressable key={mode} onPress={() => onFeedModeChange(mode)} style={[styles.feedModeButton, feedMode === mode && styles.feedModeButtonActive]} accessibilityRole="tab" accessibilityState={{ selected: feedMode === mode }}><Text style={[styles.feedModeLabel, { color: feedMode === mode ? '#FFFFFF' : foreground }]}>{label}</Text></Pressable>)}
      </View>
      {loading && <View style={styles.loadingRow}><ActivityIndicator color={palette.orange} /><Text style={[styles.meta, { color: muted }]}>Loading…</Text></View>}
      {!!error && <View style={[styles.errorCard, { backgroundColor: dark ? '#2A1814' : '#FFF1EC', borderColor: dark ? '#6C3424' : '#FFC5B2' }]}><Text style={[styles.errorText, { color: dark ? '#FFD0C0' : '#9D351B' }]}>{error}</Text><Pressable onPress={onRefresh} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry loading feed"><Text style={styles.retryText}>Retry</Text></Pressable></View>}
    </View>
  ), [dark, foreground, muted, hasUnreadNotifications, unreadNotificationCount, onOpenNotifications, onCompose, feedMode, onFeedModeChange, loading, error, onRefresh])

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      photoUri={profileAvatarUrl}
      dark={dark}
      following={followedSet.has(item.handle.replace(/^@/, '').toLowerCase())}
      onLike={() => onLike(item.id)}
      onSave={() => onSave(item.id)}
      onComments={() => onComments(item.id)}
      onDelete={() => onDelete(item.id)}
      onToggleFollow={() => onToggleFollow(item.handle)}
      onOpenProfile={onOpenProfile}
      onOpenClub={onOpenClub}
      client={client}
      commentsExpanded={commentsPostId === item.id}
      highlightedCommentId={commentsPostId === item.id ? highlightedCommentId : null}
      commentText={commentText}
      commentTags={commentTags}
      commentFocusRequest={commentFocusRequest}
      replyTo={commentsPostId === item.id ? replyTo : null}
      onCommentTextChange={onCommentTextChange}
      onCommentMentionSelected={onCommentMentionSelected}
      onSubmitComment={onSubmitComment}
      onReply={onReply}
      onCancelReply={onCancelReply}
    />
  ), [profileAvatarUrl, dark, followedSet, onLike, onSave, onComments, onDelete, onToggleFollow, onOpenProfile, onOpenClub, client, commentsPostId, highlightedCommentId, commentText, commentTags, commentFocusRequest, replyTo, onCommentTextChange, onCommentMentionSelected, onSubmitComment, onReply, onCancelReply])

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <FlatList
      ref={listRef}
      style={{ flex: 1, backgroundColor: background }}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading
          ? <View style={[styles.emptyCard, { backgroundColor: dark ? palette.darkSurface : '#FFFFFF', borderColor: dark ? palette.darkBorder : palette.lightBorder }]}><ActivityIndicator color={palette.orange} /><Text style={[styles.emptyBody, { color: muted }]}>Loading…</Text></View>
          : <View style={[styles.emptyCard, { backgroundColor: dark ? palette.darkSurface : '#FFFFFF', borderColor: dark ? palette.darkBorder : palette.lightBorder }]}>
            <Icon name="people-outline" color={palette.orange} size={35} />
            <Text style={[styles.emptyTitle, { color: foreground }]}>No posts yet.</Text>
            <Text style={[styles.emptyBody, { color: muted }]}>Follow people or create a post.</Text>
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
  listContent: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 120, flexGrow: 1 },
  headerArea: { marginBottom: 22 },
  headerRow: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  // Keep the header flexible on narrow iPhones; the action buttons size themselves.
  headerSide: { width: 46 },
  headerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flex: 1 },
  wordmark: { fontSize: 28, fontFamily: 'Exo2_800ExtraBold_Italic', letterSpacing: -1.4 },
  brandDot: { color: palette.orange, fontSize: 30, fontWeight: '900' },
  unreadBadge: { position: 'absolute', right: 2, top: -3, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.orange, borderWidth: 1.5, borderColor: '#FFFFFF' },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  heading: { fontSize: 27, fontWeight: '800', letterSpacing: -0.9 },
  subheading: { fontSize: 13, marginTop: 5 },
  feedModeControl: { flexDirection: 'row', padding: 4, borderRadius: 20, borderWidth: 1, marginTop: 0, marginBottom: 3 },
  feedModeButton: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  feedModeButtonActive: { backgroundColor: palette.orange },
  feedModeLabel: { fontSize: 11, fontWeight: '900' },
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
  tagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2, marginBottom: 2 },
  tagChip: { maxWidth: 150, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  tagChipText: { fontSize: 10, fontWeight: '800' },
  postImage: { width: '100%', aspectRatio: 1.45, borderRadius: 16, backgroundColor: '#343B34' },
  imageFallback: { width: '100%', aspectRatio: 1.45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  locationText: { fontSize: 11, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, marginTop: 15, paddingTop: 8 },
  actionButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 12, fontWeight: '700' },
  commentPreview: { marginTop: 4, paddingVertical: 5 },
  commentText: { fontSize: 11, lineHeight: 17 },
  inlineComments: { borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  inlineCommentsTitle: { fontSize: 13, fontWeight: '900', marginBottom: 10 },
  noComments: { fontSize: 11, marginBottom: 10 },
  inlineComment: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  highlightedComment: { borderRadius: 14, backgroundColor: '#FF79001A', padding: 5, marginHorizontal: -5 },
  inlineReply: { marginTop: 8, marginLeft: 12 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentBubble: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  commentAuthor: { fontSize: 11, fontWeight: '900', marginBottom: 3 },
  commentBody: { fontSize: 12, lineHeight: 17 },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, paddingHorizontal: 3 },
  commentTime: { fontSize: 9 },
  replyAction: { fontSize: 10, fontWeight: '900' },
  repliesToggle: { fontSize: 10, fontWeight: '800', marginTop: 7, paddingHorizontal: 3 },
  replyingTo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 7 },
  replyingText: { fontSize: 10, fontWeight: '800' },
  inlineCommentInputRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  inlineCommentInput: { flex: 1, minWidth: 0, minHeight: 42, maxHeight: 100, borderWidth: 1, borderRadius: 19, paddingHorizontal: 13, paddingVertical: 10, fontSize: 12 },
  inlineSendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionSheetContent: { paddingHorizontal: 18, paddingBottom: 18, gap: 9 },
  actionSheetTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  actionSheetSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 5 },
  actionSheetButton: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionSheetButtonText: { fontSize: 13, fontWeight: '800' },
  actionSheetCancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  sharedClubCard: { flexDirection: 'row', minHeight: 112, borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  sharedClubImage: { width: 104, height: 112 },
  sharedClubFallback: { width: 104, height: 112, alignItems: 'center', justifyContent: 'center', gap: 5 },
  sharedClubCopy: { flex: 1, padding: 12, justifyContent: 'center' },
  sharedClubName: { fontSize: 14, fontWeight: '900' },
  sharedClubMeta: { fontSize: 10, marginTop: 4 },
  sharedClubLevels: { fontSize: 10, fontWeight: '800', marginTop: 6 },
  sharedClubAction: { fontSize: 10, fontWeight: '900', marginTop: 8 },
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
