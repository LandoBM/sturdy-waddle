import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostTag } from '../src/posts'
import { TaggedPostText } from './TaggedPostText'
import { BottomSheet } from './BottomSheet'

export function PublicProfileScreen({ client, profileId, currentUserId, darkMode = false, AppIcon, onBack, onDeletePost, onOpenProfile, onOpenClub, postReloadKey = 0 }: { client: SupabaseClient; profileId: string; currentUserId?: string; darkMode?: boolean; AppIcon: (props: any) => React.ReactNode; onBack: () => void; onDeletePost?: (postId: string) => void; onOpenProfile?: (id: string) => void; onOpenClub?: (id: string) => void; postReloadKey?: number }) {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const dark = darkMode
  const foreground = dark ? '#F5F5F5' : '#171C19'
  const muted = dark ? '#A1A1AA' : '#68736B'
  const background = dark ? '#090A0C' : '#F5F6F2'
  const surface = dark ? '#17191D' : '#FFFFFF'
  const border = dark ? '#303238' : '#E7EAE4'
  const confirmDelete = (postId: string) => setDeletePostId(postId)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ data: profileRow, error: profileError }, postResult, followerResult, followingResult, followResult] = await Promise.all([
        client.from('profiles').select('id,display_name,username,bio,avatar_url').eq('id', profileId).maybeSingle(),
        client.from('community_posts').select('id,body,image_url,created_at').eq('author_id', profileId).eq('visibility', 'public').order('created_at', { ascending: false }).limit(20),
        client.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileId),
        client.from('user_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileId),
        currentUserId ? client.from('user_follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', profileId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ])
      if (profileError) throw profileError
      if (postResult.error) throw postResult.error
      if (followerResult.error) throw followerResult.error
      if (followingResult.error) throw followingResult.error
      if (followResult.error) throw followResult.error
      if (!active) return
      setProfile(profileRow)
      const postRows = postResult.data ?? []
      const tagResult = postRows.length ? await client.from('post_tags').select('id,post_id,tagged_profile_id,tagged_club_id').in('post_id', postRows.map((post) => post.id)) : { data: [], error: null }
      const tagRows = tagResult.error ? [] : (tagResult.data ?? [])
      const taggedProfileIds = Array.from(new Set(tagRows.map((tag: any) => tag.tagged_profile_id).filter(Boolean)))
      const taggedClubIds = Array.from(new Set(tagRows.map((tag: any) => tag.tagged_club_id).filter(Boolean)))
      const [{ data: taggedProfiles }, { data: taggedClubs }] = await Promise.all([
        taggedProfileIds.length ? client.from('profiles').select('id,display_name,username,avatar_url').in('id', taggedProfileIds) : Promise.resolve({ data: [] }),
        taggedClubIds.length ? client.from('clubs').select('id,name,badge_url').in('id', taggedClubIds) : Promise.resolve({ data: [] }),
      ])
      const profiles = Object.fromEntries((taggedProfiles ?? []).map((row: any) => [row.id, row]))
      const clubs = Object.fromEntries((taggedClubs ?? []).map((row: any) => [row.id, row]))
      const tagsByPost = new Map<string, PostTag[]>()
      for (const tag of tagRows as any[]) {
        const profile = tag.tagged_profile_id ? profiles[tag.tagged_profile_id] : null
        const club = tag.tagged_club_id ? clubs[tag.tagged_club_id] : null
        if (!profile && !club) continue
        const resolved = profile ? { id: tag.id, kind: 'profile' as const, profileId: profile.id, label: profile.display_name || profile.username || 'Roava member', handle: profile.username, avatarUrl: profile.avatar_url } : { id: tag.id, kind: 'club' as const, clubId: club.id, label: club.name, handle: club.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'club', avatarUrl: club.badge_url }
        tagsByPost.set(tag.post_id, [...(tagsByPost.get(tag.post_id) ?? []), resolved])
      }
      setPosts(postRows.map((post) => ({ ...post, tags: tagsByPost.get(post.id) ?? [] })))
      setFollowers(followerResult.count ?? 0)
      setFollowing(followingResult.count ?? 0)
      setIsFollowing(!!followResult.data)
    }
    void load().catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this profile.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client, profileId, currentUserId, postReloadKey])

  const toggleFollow = async () => {
    if (!currentUserId || currentUserId === profileId) return
    const next = !isFollowing
    setIsFollowing(next)
    setFollowers((value) => Math.max(0, value + (next ? 1 : -1)))
    const response = next
      ? await client.from('user_follows').insert({ follower_id: currentUserId, following_id: profileId, following_username: profile?.username })
      : await client.from('user_follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId)
    if (response.error) { setIsFollowing(!next); setFollowers((value) => Math.max(0, value + (next ? -1 : 1))) }
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FF5A1F" /><Text style={{ color: muted, marginTop: 10 }}>Loading profile…</Text></View>
  if (error || !profile) return <View style={{ flex: 1, backgroundColor: background, padding: 22 }}><Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}><AppIcon name="arrow-back" color={foreground} /><Text style={{ color: foreground, fontWeight: '800' }}>Back</Text></Pressable><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>Profile unavailable</Text><Text style={{ color: muted, marginTop: 8 }}>{error || 'This profile could not be found.'}</Text></View>
  return <><ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}><Pressable onPress={onBack} accessibilityLabel="Back to previous results"><AppIcon name="arrow-back" color={foreground} size={24} /></Pressable><Text style={{ flex: 1, color: foreground, fontSize: 24, fontWeight: '900' }}>Profile</Text></View><View style={{ padding: 18, borderRadius: 24, backgroundColor: surface, borderWidth: 1, borderColor: border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: 78, height: 78, borderRadius: 39 }} /> : <View style={{ width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F22' }}><AppIcon name="person" size={32} color="#FF5A1F" /></View>}<View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}><Text style={{ color: foreground, fontSize: 20, fontWeight: '900', flexShrink: 1 }} numberOfLines={2}>{profile.display_name || profile.username}</Text><Text style={{ color: muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>@{profile.username || 'roava'}</Text></View></View><Text style={{ color: muted, fontSize: 13, lineHeight: 19, marginTop: 16 }}>{profile.bio || 'This athlete has not added a bio yet.'}</Text><View style={{ flexDirection: 'row', gap: 22, marginTop: 16, flexWrap: 'wrap' }}><Text style={{ color: foreground, fontWeight: '800' }}>{posts.length} <Text style={{ color: muted, fontWeight: '500' }}>posts</Text></Text><Text style={{ color: foreground, fontWeight: '800' }}>{followers} <Text style={{ color: muted, fontWeight: '500' }}>followers</Text></Text><Text style={{ color: foreground, fontWeight: '800' }}>{following} <Text style={{ color: muted, fontWeight: '500' }}>following</Text></Text></View>{currentUserId && currentUserId !== profileId && <Pressable onPress={() => { void toggleFollow() }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: isFollowing ? 'transparent' : '#FF5A1F', borderWidth: 1, borderColor: '#FF5A1F', marginTop: 16 }}><Text style={{ color: isFollowing ? '#FF5A1F' : '#FFFFFF', fontWeight: '900' }}>{isFollowing ? 'Following' : 'Follow'}</Text></Pressable>}</View><Text style={{ color: foreground, fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 10 }}>Public posts</Text>{!posts.length && <Text style={{ color: muted, fontSize: 12 }}>No public posts yet.</Text>}{posts.map((post) => <View key={post.id} style={{ padding: 14, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, marginBottom: 9 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1, minWidth: 0 }}><TaggedPostText body={post.body} tags={post.tags} color={foreground} onOpenProfile={onOpenProfile} onOpenClub={onOpenClub} /></View>{currentUserId === profileId && onDeletePost && <Pressable onPress={() => confirmDelete(post.id)} accessibilityRole="button" accessibilityLabel="Post options"><AppIcon name="ellipsis-horizontal" color={muted} size={20} /></Pressable>}</View>{post.image_url && <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 150, borderRadius: 14, marginTop: 10 }} resizeMode="cover" />}</View>)}</ScrollView><BottomSheet visible={!!deletePostId} onClose={() => setDeletePostId(null)} backgroundColor={surface} borderColor={border} accessibilityLabel="Delete post confirmation"><View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 10 }}><Text style={{ color: foreground, fontSize: 18, fontWeight: '900' }}>Delete post?</Text><Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>Are you sure you want to permanently delete this post? This action cannot be undone.</Text><Pressable onPress={() => { const id = deletePostId; setDeletePostId(null); if (id) onDeletePost?.(id) }} style={{ minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: '#B42318', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#B42318', fontWeight: '900' }}>Delete post</Text></Pressable><Pressable onPress={() => setDeletePostId(null)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: muted, fontWeight: '800' }}>Cancel</Text></Pressable></View></BottomSheet></>
}
