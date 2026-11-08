import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'

export function PublicProfileScreen({ client, profileId, currentUserId, darkMode = false, AppIcon, onBack, onDeletePost, postReloadKey = 0 }: { client: SupabaseClient; profileId: string; currentUserId?: string; darkMode?: boolean; AppIcon: (props: any) => React.ReactNode; onBack: () => void; onDeletePost?: (postId: string) => void; postReloadKey?: number }) {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dark = darkMode
  const foreground = dark ? '#F5F5F5' : '#171C19'
  const muted = dark ? '#A1A1AA' : '#68736B'
  const background = dark ? '#090A0C' : '#F5F6F2'
  const surface = dark ? '#17191D' : '#FFFFFF'
  const border = dark ? '#303238' : '#E7EAE4'
  const confirmDelete = (postId: string) => Alert.alert('Delete post?', 'Are you sure you want to permanently delete this post? This action cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDeletePost?.(postId) }])

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
      setPosts(postResult.data ?? [])
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
  return <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={{ padding: 18, paddingBottom: 34 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}><Pressable onPress={onBack} accessibilityLabel="Back to previous results"><AppIcon name="arrow-back" color={foreground} size={24} /></Pressable><Text style={{ flex: 1, color: foreground, fontSize: 24, fontWeight: '900' }}>Profile</Text></View><View style={{ padding: 18, borderRadius: 24, backgroundColor: surface, borderWidth: 1, borderColor: border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: 78, height: 78, borderRadius: 39 }} /> : <View style={{ width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F22' }}><AppIcon name="person" size={32} color="#FF5A1F" /></View>}<View style={{ flex: 1, marginLeft: 14 }}><Text style={{ color: foreground, fontSize: 20, fontWeight: '900' }}>{profile.display_name || profile.username}</Text><Text style={{ color: muted, fontSize: 12, marginTop: 3 }}>@{profile.username || 'fithive'}</Text></View></View><Text style={{ color: muted, fontSize: 13, lineHeight: 19, marginTop: 16 }}>{profile.bio || 'This athlete has not added a bio yet.'}</Text><View style={{ flexDirection: 'row', gap: 22, marginTop: 16 }}><Text style={{ color: foreground, fontWeight: '800' }}>{posts.length} <Text style={{ color: muted, fontWeight: '500' }}>posts</Text></Text><Text style={{ color: foreground, fontWeight: '800' }}>{followers} <Text style={{ color: muted, fontWeight: '500' }}>followers</Text></Text><Text style={{ color: foreground, fontWeight: '800' }}>{following} <Text style={{ color: muted, fontWeight: '500' }}>following</Text></Text></View>{currentUserId && currentUserId !== profileId && <Pressable onPress={() => { void toggleFollow() }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: isFollowing ? 'transparent' : '#FF5A1F', borderWidth: 1, borderColor: '#FF5A1F', marginTop: 16 }}><Text style={{ color: isFollowing ? '#FF5A1F' : '#FFFFFF', fontWeight: '900' }}>{isFollowing ? 'Following' : 'Follow'}</Text></Pressable>}</View><Text style={{ color: foreground, fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 10 }}>Public posts</Text>{!posts.length && <Text style={{ color: muted, fontSize: 12 }}>No public posts yet.</Text>}{posts.map((post) => <View key={post.id} style={{ padding: 14, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, marginBottom: 9 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: foreground, fontSize: 13, lineHeight: 19 }}>{post.body}</Text>{currentUserId === profileId && onDeletePost && <Pressable onPress={() => confirmDelete(post.id)} accessibilityRole="button" accessibilityLabel="Post options"><AppIcon name="ellipsis-horizontal" color={muted} size={20} /></Pressable>}</View>{post.image_url && <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 150, borderRadius: 14, marginTop: 10 }} resizeMode="cover" />}</View>)}</ScrollView>
}
