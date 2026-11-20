import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EditClubScreen } from './EditClubScreen'
import type { PostTag } from '../src/posts'
import { TaggedPostText } from './TaggedPostText'
import { normalizeClubSkillLevels, CLUB_SKILL_LEVEL_OPTIONS, type ClubSkillLevel } from '../src/clubSkillLevels'
import type { SharedClubPreview } from '../src/sharedClub'
import { resolveClubMedia } from './clubMedia'
import { BottomSheet } from './BottomSheet'

type ClubDetailScreenProps = {
  client: SupabaseClient
  clubId: string
  currentUserId?: string
  darkMode?: boolean
  AppIcon: (props: any) => React.ReactNode
  onBack: () => void
  onOpenProfile: (profileId: string) => void
  onOpenClub?: (clubId: string) => void
  onCompose: (clubId: string) => void
  onShareClub?: (club: SharedClubPreview) => void
  onDeletePost?: (postId: string) => void
  postReloadKey?: number
  targetPostId?: string | null
}

type Club = { id: string; owner_id: string; name: string; description: string; activity: string; location: string; skill_levels?: ClubSkillLevel[] | null; image_url?: string | null; badge_url?: string | null; cover_image_url?: string | null; background_color?: string | null; visibility?: string | null }
type Profile = { id: string; display_name?: string | null; username?: string | null; avatar_url?: string | null; bio?: string | null }
type ClubPost = { id: string; author_id: string; body: string; image_url?: string | null; created_at: string; author?: Profile; tags?: PostTag[] }

export function ClubDetailScreen({ client, clubId, currentUserId, darkMode = false, AppIcon, onBack, onOpenProfile, onOpenClub, onCompose, onShareClub, onDeletePost, postReloadKey = 0, targetPostId = null }: ClubDetailScreenProps) {
  const [club, setClub] = useState<Club | null>(null)
  const [owner, setOwner] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [confirmSheet, setConfirmSheet] = useState<{ kind: 'delete' | 'discard'; postId?: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [membershipBusy, setMembershipBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [targetPostMissing, setTargetPostMissing] = useState(false)
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const scrollRef = useRef<ScrollViewInstance | null>(null)
  const postLayouts = useRef<Record<string, number>>({})
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const coverHeight = Math.min(235, Math.max(190, windowWidth * 0.58))
  const foreground = darkMode ? '#F5F5F5' : '#171C19'
  const muted = darkMode ? '#A1A1AA' : '#68736B'
  const background = darkMode ? '#090A0C' : '#F5F6F2'
  const surface = darkMode ? '#17191D' : '#FFFFFF'
  const elevated = darkMode ? '#24262B' : '#F8FAF7'
  const border = darkMode ? '#303238' : '#E7EAE4'
  const orange = '#FF5A1F'
  const confirmDelete = (postId: string) => setConfirmSheet({ kind: 'delete', postId })

  const loadClub = async () => {
    const { data: clubRow, error: clubError } = await client.from('clubs').select('id,owner_id,name,description,activity,location,skill_levels,image_url,badge_url,cover_image_url,background_color,visibility').eq('id', clubId).maybeSingle()
    if (clubError) throw clubError
    if (!clubRow) throw new Error('This club is no longer available or you do not have access to it.')
    const [{ data: ownerRow, error: ownerError }, memberResult, postResult, postsResult, membershipResult] = await Promise.all([
      client.from('profiles').select('id,display_name,username,avatar_url,bio').eq('id', clubRow.owner_id).maybeSingle(),
      client.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
      client.from('community_posts').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
      client.from('community_posts').select('id,author_id,body,image_url,created_at').eq('club_id', clubId).order('created_at', { ascending: false }).limit(20),
      currentUserId ? client.from('club_memberships').select('status,role').eq('club_id', clubId).eq('member_id', currentUserId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ])
    if (ownerError) throw ownerError
    if (memberResult.error) throw memberResult.error
    if (postResult.error) throw postResult.error
    if (postsResult.error) throw postsResult.error
    if (membershipResult.error) throw membershipResult.error
    let postRows = (postsResult.data ?? []) as ClubPost[]
    let targetWasFound = !targetPostId || postRows.some((post) => post.id === targetPostId)
    if (targetPostId && !targetWasFound) {
      const targetResult = await client.from('community_posts').select('id,author_id,body,image_url,created_at').eq('id', targetPostId).eq('club_id', clubId).maybeSingle()
      if (!targetResult.error && targetResult.data) {
        postRows = [...postRows, targetResult.data as ClubPost]
        targetWasFound = true
      }
    }
    postRows.sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
    const authorIds = Array.from(new Set(postRows.map((post) => post.author_id)))
    const authorsResponse = authorIds.length ? await client.from('profiles').select('id,display_name,username,avatar_url').in('id', authorIds) : { data: [], error: null }
    if (authorsResponse.error) throw authorsResponse.error
    const authors = Object.fromEntries(((authorsResponse.data ?? []) as Profile[]).map((profile) => [profile.id, profile]))
    const tagResult = postRows.length ? await client.from('post_tags').select('id,post_id,tagged_profile_id,tagged_club_id,source').in('post_id', postRows.map((post) => post.id)) : { data: [], error: null }
    const tagRows = tagResult.error ? [] : (tagResult.data ?? [])
    const taggedProfileIds = Array.from(new Set(tagRows.map((tag: any) => tag.tagged_profile_id).filter(Boolean)))
    const taggedClubIds = Array.from(new Set(tagRows.map((tag: any) => tag.tagged_club_id).filter(Boolean)))
    const [{ data: taggedProfiles }, { data: taggedClubs }] = await Promise.all([
      taggedProfileIds.length ? client.from('profiles').select('id,display_name,username,avatar_url').in('id', taggedProfileIds) : Promise.resolve({ data: [] }),
      taggedClubIds.length ? client.from('clubs').select('id,name,badge_url').in('id', taggedClubIds) : Promise.resolve({ data: [] }),
    ])
    const taggedProfilesById = Object.fromEntries((taggedProfiles ?? []).map((row: any) => [row.id, row]))
    const taggedClubsById = Object.fromEntries((taggedClubs ?? []).map((row: any) => [row.id, row]))
    const tagsByPost = new Map<string, PostTag[]>()
    for (const tag of tagRows as any[]) {
      const profile = tag.tagged_profile_id ? taggedProfilesById[tag.tagged_profile_id] : null
      const taggedClub = tag.tagged_club_id ? taggedClubsById[tag.tagged_club_id] : null
      if (!profile && !taggedClub) continue
      const resolved = profile ? { id: tag.id, kind: 'profile' as const, profileId: profile.id, label: profile.display_name || profile.username || 'Roava member', handle: profile.username, avatarUrl: profile.avatar_url } : { id: tag.id, kind: 'club' as const, clubId: taggedClub.id, label: taggedClub.name, handle: taggedClub.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'club', avatarUrl: taggedClub.badge_url }
      tagsByPost.set(tag.post_id, [...(tagsByPost.get(tag.post_id) ?? []), resolved])
    }
    const [resolvedCover, resolvedBadge] = await Promise.all([resolveClubMedia(client, clubRow.cover_image_url || clubRow.image_url), resolveClubMedia(client, clubRow.badge_url)])
    setClub(clubRow as Club)
    setOwner((ownerRow ?? null) as Profile | null)
    setMemberCount(memberResult.count ?? 0)
    setPostCount(postResult.count ?? 0)
    setMembershipStatus(membershipResult.data?.status ?? (clubRow.owner_id === currentUserId ? 'owner' : null))
    setCanManage(clubRow.owner_id === currentUserId || (membershipResult.data?.status === 'active' && ['owner', 'moderator'].includes(membershipResult.data?.role ?? '')))
    setPosts(postRows.map((post) => ({ ...post, author: authors[post.author_id], tags: tagsByPost.get(post.id) ?? [] })))
    setTargetPostMissing(Boolean(targetPostId && !targetWasFound))
    setCoverUrl(resolvedCover)
    setBadgeUrl(resolvedBadge)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void loadClub().catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this club.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client, clubId, currentUserId, reloadKey, postReloadKey, targetPostId])

  useEffect(() => {
    if (!targetPostId || !posts.some((post) => post.id === targetPostId)) return
    setHighlightedPostId(targetPostId)
    const timeout = setTimeout(() => {
      const y = postLayouts.current[targetPostId]
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true })
    }, 120)
    const clearHighlight = setTimeout(() => setHighlightedPostId(null), 3600)
    return () => { clearTimeout(timeout); clearTimeout(clearHighlight) }
  }, [posts, targetPostId])

  const updateMembership = async () => {
    if (!currentUserId || !club || membershipBusy || membershipStatus === 'owner') return
    setMembershipBusy(true)
    try {
      if (membershipStatus === 'active') {
        const { error: deleteError } = await client.from('club_memberships').delete().eq('club_id', clubId).eq('member_id', currentUserId)
        if (deleteError) throw deleteError
        setMembershipStatus(null)
        setMemberCount((value) => Math.max(0, value - 1))
      } else if (!membershipStatus) {
        const { error: insertError } = await client.from('club_memberships').insert({ club_id: clubId, member_id: currentUserId, status: 'pending' })
        if (insertError) throw insertError
        setMembershipStatus('pending')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update membership.')
    } finally {
      setMembershipBusy(false)
    }
  }

  const closeEditor = () => {
    if (!editDirty) { setEditing(false); return }
    setConfirmSheet({ kind: 'discard' })
  }

  const refreshClub = async () => {
    if (refreshing) return
    setRefreshing(true)
    setError('')
    try { await loadClub() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to refresh this club.') } finally { setRefreshing(false) }
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={orange} /><Text style={{ color: muted, marginTop: 10 }}>Loading club…</Text></View>
  if (error || !club) return <View style={{ flex: 1, backgroundColor: background, paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}><Pressable onPress={onBack} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}><AppIcon name="arrow-back" color={foreground} /><Text style={{ color: foreground, fontWeight: '800' }}>Back</Text></Pressable><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>Club unavailable</Text><Text style={{ color: muted, lineHeight: 19, marginTop: 8 }}>{error || 'This club could not be found.'}</Text></View>

  const ownerName = owner?.display_name || owner?.username || 'Roava member'
  const isMember = membershipStatus === 'active'
  const membershipLabel = membershipStatus === 'pending' ? 'Request pending' : isMember ? 'Leave club' : membershipStatus === 'owner' ? 'Club owner' : 'Join club'
  return (
    <>
      <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refreshClub() }} tintColor={orange} colors={[orange]} />}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: background }}>
        <View style={{ width: 92, flexDirection: 'row', justifyContent: 'flex-start' }}><Pressable onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }} accessibilityLabel="Back to search results"><AppIcon name="arrow-back" color={foreground} /></Pressable></View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}><Text style={{ color: foreground, fontSize: 19, fontWeight: '900', flexShrink: 1, textAlign: 'center' }} numberOfLines={1} ellipsizeMode="tail">{club.name}</Text></View>
        <View style={{ width: 92, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}><Pressable onPress={() => onShareClub?.({ id: club.id, name: club.name, activity: club.activity, location: club.location, skillLevels: normalizeClubSkillLevels(club.skill_levels), coverImageUrl: coverUrl })} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }} accessibilityRole="button" accessibilityLabel={`Share ${club.name}`}><AppIcon name="share-outline" color={foreground} /></Pressable>{canManage ? <Pressable onPress={() => setEditing(true)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F' }} accessibilityLabel="Edit club"><AppIcon name="create-outline" color="#FFFFFF" /></Pressable> : <Pressable style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: elevated, borderWidth: 1, borderColor: border }} accessibilityLabel="Club actions"><AppIcon name="ellipsis-horizontal" color={foreground} /></Pressable>}</View>
      </View>
      <View style={{ marginHorizontal: 16, height: coverHeight, borderRadius: 26, overflow: 'visible', backgroundColor: club.background_color || (darkMode ? '#24262B' : '#DDE5DA') }}>
        {coverUrl && <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%', borderRadius: 26, opacity: 0.78 }} resizeMode="cover" />}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, backgroundColor: '#090A0CB8' }} />
        <View style={{ position: 'absolute', left: 100, right: 18, bottom: 20 }}><Text style={{ color: '#FF8A3D', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }}>{(club.activity || 'SPORTS CLUB').toUpperCase()}</Text><Text style={{ color: '#FFFFFF', fontSize: 29, fontWeight: '900', marginTop: 4 }} numberOfLines={2} adjustsFontSizeToFit>{club.name}</Text><Text style={{ color: '#F5F5F5', fontSize: 12, marginTop: 4 }} numberOfLines={1}>{club.location || 'Location not provided'} · {club.visibility === 'private' ? 'Private' : 'Public'}</Text></View>
        <View style={{ position: 'absolute', left: 18, bottom: -30, width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: surface, backgroundColor: elevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{badgeUrl ? <Image source={{ uri: badgeUrl }} style={{ width: '100%', height: '100%' }} /> : <AppIcon name="people" size={28} color={orange} />}</View>
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 47 }}>
        <View style={{ flexDirection: 'row', gap: 9, marginBottom: 15 }}>{[['MEMBERS', memberCount], ['POSTS', postCount]].map(([label, value]) => <View key={String(label)} style={{ flex: 1, padding: 13, borderRadius: 17, backgroundColor: elevated, borderWidth: 1, borderColor: border }}><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>{value}</Text><Text style={{ color: muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 3 }}>{label}</Text></View>)}</View>
        <Pressable onPress={() => owner && onOpenProfile(owner.id)} disabled={!owner} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 13, borderRadius: 18, backgroundColor: elevated, borderWidth: 1, borderColor: border }} accessibilityRole="button" accessibilityLabel={`Open ${ownerName}'s profile`}>
          {owner?.avatar_url ? <Image source={{ uri: owner.avatar_url }} style={{ width: 52, height: 52, borderRadius: 26 }} /> : <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F22' }}><AppIcon name="person" color={orange} /></View>}
          <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>CLUB OWNER</Text><Text style={{ color: foreground, fontSize: 14, fontWeight: '800', marginTop: 3 }} numberOfLines={1}>{ownerName}</Text><Text style={{ color: muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{owner?.username ? `@${owner.username}` : 'Public profile'}</Text><Text style={{ color: muted, fontSize: 11, lineHeight: 16, marginTop: 7 }}>{owner?.bio?.trim() || 'No bio added yet.'}</Text></View><AppIcon name="chevron-forward" color={muted} size={17} />
        </Pressable>
        {currentUserId && <Pressable onPress={() => { void updateMembership() }} disabled={membershipBusy || membershipStatus === 'pending' || membershipStatus === 'owner'} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: isMember ? 'transparent' : orange, borderWidth: 1, borderColor: orange, marginTop: 14, opacity: membershipBusy || membershipStatus === 'pending' ? 0.65 : 1 }}><Text style={{ color: isMember ? orange : '#FFFFFF', fontWeight: '900' }}>{membershipBusy ? 'Updating…' : membershipLabel}</Text></Pressable>}
        {!!error && <Text style={{ color: '#FF8A3D', fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error}</Text>}
        <View style={{ marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border }}><Text style={{ color: foreground, fontSize: 18, fontWeight: '900' }}>About the club</Text><Text style={{ color: muted, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{club.description || 'This club has not added a description yet.'}</Text><Text style={{ color: foreground, fontSize: 13, fontWeight: '900', marginTop: 16 }}>Skill levels</Text>{normalizeClubSkillLevels(club.skill_levels).length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{normalizeClubSkillLevels(club.skill_levels).map((level) => <View key={level} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, backgroundColor: darkMode ? '#4A281A' : '#FFF0E6', borderWidth: 1, borderColor: orange }}><Text style={{ color: orange, fontSize: 11, fontWeight: '800' }}>{CLUB_SKILL_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level}</Text></View>)}</View> : <Text style={{ color: muted, fontSize: 12, marginTop: 7 }}>Skill levels not specified</Text>}</View>
        {(isMember || canManage) && <Pressable onPress={() => onCompose(club.id)} style={{ minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: orange, marginTop: 14 }} accessibilityRole="button" accessibilityLabel={`Create a post for ${club.name}`}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Post to {club.name}</Text></Pressable>}
        <Text style={{ color: foreground, fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 10 }}>Club posts</Text>
        {targetPostMissing && <View style={{ padding: 14, borderRadius: 16, backgroundColor: darkMode ? '#2A1814' : '#FFF1EC', borderWidth: 1, borderColor: darkMode ? '#6C3424' : '#FFC5B2', marginBottom: 10 }}><Text style={{ color: darkMode ? '#FFD0C0' : '#9D351B', fontSize: 12 }}>This post is no longer available.</Text></View>}
        {!posts.length && <View style={{ padding: 16, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border }}><Text style={{ color: muted, fontSize: 12 }}>No club posts yet.</Text></View>}
        {posts.map((post) => { const isClubAuthored = post.author_id === club.owner_id; return <View key={post.id} onLayout={(event) => { postLayouts.current[post.id] = event.nativeEvent.layout.y; if (post.id === targetPostId) scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 120), animated: true }) }} style={{ padding: 14, borderRadius: 18, backgroundColor: highlightedPostId === post.id ? (darkMode ? '#2B211B' : '#FFF4EE') : surface, borderWidth: highlightedPostId === post.id ? 2 : 1, borderColor: highlightedPostId === post.id ? orange : border, marginBottom: 9 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Pressable onPress={() => !isClubAuthored && post.author && onOpenProfile(post.author.id)} disabled={isClubAuthored || !post.author} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F22', overflow: 'hidden' }}>{isClubAuthored && badgeUrl ? <Image source={{ uri: badgeUrl }} style={{ width: 32, height: 32 }} /> : post.author?.avatar_url ? <Image source={{ uri: post.author.avatar_url }} style={{ width: 32, height: 32 }} /> : <AppIcon name={isClubAuthored ? 'people' : 'person'} size={14} color={orange} />}</View><View><Text style={{ color: foreground, fontSize: 12, fontWeight: '800' }}>{isClubAuthored ? club.name : post.author?.display_name || post.author?.username || 'Roava member'}</Text><Text style={{ color: muted, fontSize: 10, marginTop: 2 }}>{isClubAuthored ? `@${club.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'club'}` : new Date(post.created_at).toLocaleDateString()}</Text></View></Pressable>{currentUserId === post.author_id && onDeletePost && <Pressable onPress={() => confirmDelete(post.id)} accessibilityRole="button" accessibilityLabel="Post options" style={{ padding: 6 }}><AppIcon name="ellipsis-horizontal" color={muted} size={20} /></Pressable>}</View><TaggedPostText body={post.body} tags={post.tags} color={foreground} onOpenProfile={onOpenProfile} onOpenClub={onOpenClub} />{post.image_url && <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 150, borderRadius: 14, marginTop: 10 }} resizeMode="cover" />}</View> })}
      </View>
      </ScrollView>
      <Modal visible={editing} animationType="slide" onRequestClose={closeEditor}>
        <EditClubScreen
          client={client}
          darkMode={darkMode}
          AppIcon={AppIcon}
          club={{ ...club, coverPath: club.cover_image_url, badgePath: club.badge_url, coverUrl, badgeUrl }}
          onCancel={closeEditor}
          onDirtyChange={setEditDirty}
          onSaved={() => { setEditDirty(false); setEditing(false); setReloadKey((value) => value + 1) }}
        />
      </Modal>
      <BottomSheet visible={!!confirmSheet} onClose={() => setConfirmSheet(null)} backgroundColor={surface} borderColor={border} accessibilityLabel={confirmSheet?.kind === 'discard' ? 'Discard changes confirmation' : 'Delete post confirmation'}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 10 }}>
          <Text style={{ color: foreground, fontSize: 18, fontWeight: '900' }}>{confirmSheet?.kind === 'discard' ? 'Discard changes?' : 'Delete post?'}</Text>
          <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>{confirmSheet?.kind === 'discard' ? 'Your unsaved club changes will be lost.' : 'Are you sure you want to permanently delete this post? This action cannot be undone.'}</Text>
          <Pressable onPress={() => { const next = confirmSheet; setConfirmSheet(null); if (next?.kind === 'delete' && next.postId) onDeletePost?.(next.postId); if (next?.kind === 'discard') { setEditDirty(false); setEditing(false) } }} style={{ minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: '#B42318', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#B42318', fontWeight: '900' }}>{confirmSheet?.kind === 'discard' ? 'Discard changes' : 'Delete post'}</Text></Pressable>
          <Pressable onPress={() => setConfirmSheet(null)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: muted, fontWeight: '800' }}>{confirmSheet?.kind === 'discard' ? 'Keep editing' : 'Cancel'}</Text></Pressable>
        </View>
      </BottomSheet>
    </>
  )
}
