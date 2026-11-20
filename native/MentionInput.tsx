import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostTag } from '../src/posts'
import { activeMentionToken, insertMention } from '../src/postTags'

type MentionInputProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  client: SupabaseClient
  value: string
  onChangeText: (value: string) => void
  dark: boolean
  onMentionSelected: (tag: PostTag) => void
  focusRequest?: number
}

const orange = '#FF7900'

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'R'
}

export function MentionInput({ client, value, onChangeText, dark, onMentionSelected, focusRequest = 0, style, ...props }: MentionInputProps) {
  const inputRef = useRef<any>(null)
  const [cursor, setCursor] = useState(value.length)
  const [suggestions, setSuggestions] = useState<PostTag[]>([])
  const [loading, setLoading] = useState(false)
  const token = activeMentionToken(value, Math.min(cursor, value.length))
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? '#A9B3A9' : '#68736B'
  const surface = dark ? '#171C19' : '#FFFFFF'
  const border = dark ? '#303832' : '#E7EAE4'

  useEffect(() => {
    if (focusRequest > 0) inputRef.current?.focus()
  }, [focusRequest])

  useEffect(() => {
    if (!token) {
      setSuggestions([])
      return
    }
    let active = true
    const search = async () => {
      setLoading(true)
      try {
        const term = token.query.trim().replace(/[%(),]/g, '')
        const profileQuery = client.from('profiles').select('id,display_name,username,avatar_url').limit(8)
        const clubQuery = client.from('clubs').select('id,name,badge_url').limit(8)
        const [{ data: profiles, error: profileError }, { data: clubs, error: clubError }] = await Promise.all([
          term ? profileQuery.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`) : profileQuery,
          term ? clubQuery.ilike('name', `%${term}%`) : clubQuery,
        ])
        if (profileError) throw profileError
        if (clubError) throw clubError
        if (!active) return
        const people: PostTag[] = (profiles ?? []).map((row: any) => ({ id: `profile-${row.id}`, kind: 'profile', profileId: row.id, label: row.display_name || row.username || 'Roava member', handle: row.username, avatarUrl: row.avatar_url }))
        const groups: PostTag[] = (clubs ?? []).map((row: any) => ({ id: `club-${row.id}`, kind: 'club', clubId: row.id, label: row.name, handle: row.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'club', avatarUrl: row.badge_url }))
        setSuggestions([...people, ...groups])
      } catch {
        if (active) setSuggestions([])
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = setTimeout(() => { void search() }, 120)
    return () => { active = false; clearTimeout(timer) }
  }, [client, token?.query])

  const choose = (tag: PostTag) => {
    if (!token) return
    const nextText = insertMention(value, token, tag)
    onChangeText(nextText.slice(0, 280))
    onMentionSelected(tag)
    const nextCursor = token.start + 1 + (tag.handle || tag.label).length
    setCursor(nextCursor)
    setSuggestions([])
  }

  const inputStyle = StyleSheet.flatten(style)

  return <View style={[styles.wrapper, inputStyle?.flex === 1 && styles.flexWrapper]}>
    <TextInput
      {...props}
      ref={inputRef}
      value={value}
      onChangeText={(nextValue) => { onChangeText(nextValue); setCursor(nextValue.length) }}
      onSelectionChange={(event) => setCursor(event.nativeEvent.selection.end)}
      style={[style, { color: foreground }]}
    />
    {!!token && <View style={[styles.suggestions, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.suggestionHeader}><Text style={[styles.suggestionTitle, { color: foreground }]}>Mention people or clubs</Text>{loading && <ActivityIndicator size="small" color={orange} />}</View>
      {!loading && !suggestions.length && <Text style={[styles.empty, { color: muted }]}>No matching accounts</Text>}
      {suggestions.map((tag) => <Pressable key={tag.id} onPress={() => choose(tag)} style={styles.suggestion} accessibilityRole="button" accessibilityLabel={`Mention ${tag.label}`}>
        {tag.avatarUrl ? <Image source={{ uri: tag.avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: '#FF790022' }]}><Text style={styles.initials}>{initials(tag.label)}</Text></View>}
        <View style={styles.copy}><Text style={[styles.label, { color: foreground }]} numberOfLines={1}>{tag.label}</Text><Text style={[styles.handle, { color: muted }]} numberOfLines={1}>{tag.kind === 'profile' ? `@${tag.handle || 'member'} · Person` : `${tag.handle ? `@${tag.handle}` : 'Club'} · Club`}</Text></View>
        <Ionicons name={tag.kind === 'profile' ? 'person-outline' : 'people-outline'} size={16} color={muted} />
      </Pressable>)}
    </View>}
  </View>
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', zIndex: 10 },
  flexWrapper: { width: 0, flex: 1 },
  suggestions: { maxHeight: 190, borderWidth: 1, borderRadius: 16, marginTop: 7, padding: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 7, paddingVertical: 5 },
  suggestionTitle: { fontSize: 11, fontWeight: '900' },
  suggestion: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 7, borderRadius: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { color: orange, fontWeight: '900', fontSize: 10 },
  copy: { flex: 1 },
  label: { fontSize: 12, fontWeight: '800' },
  handle: { fontSize: 10, marginTop: 2 },
  empty: { padding: 12, fontSize: 11 },
})
