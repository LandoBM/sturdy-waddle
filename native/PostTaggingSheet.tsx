import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostTag } from '../src/posts'
import { BottomSheet, BottomSheetScrollView } from './BottomSheet'

export type TagSelection = PostTag

type Props = {
  client: SupabaseClient
  visible: boolean
  dark: boolean
  selected: TagSelection[]
  onChange: (tags: TagSelection[]) => void
  onClose: () => void
  mode?: 'tags' | 'mentions'
  onMentionSelected?: (tag: TagSelection) => void
  initialQuery?: string
}

const orange = '#FF7900'

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'R'
}

export function PostTaggingSheet({ client, visible, dark, selected, onChange, onClose, mode = 'tags', onMentionSelected, initialQuery = '' }: Props) {
  const [filter, setFilter] = useState<'people' | 'clubs'>('people')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TagSelection[]>([])
  const [loading, setLoading] = useState(false)
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? '#A9B3A9' : '#68736B'
  const background = dark ? '#080B09' : '#F5F6F2'
  const surface = dark ? '#171C19' : '#FFFFFF'
  const border = dark ? '#303832' : '#E7EAE4'

  useEffect(() => {
    if (!visible) return
    setQuery(initialQuery)
    setFilter('people')
  }, [visible, mode, initialQuery])

  useEffect(() => {
    if (!visible) return
    let active = true
    const search = async () => {
      setLoading(true)
      try {
        const term = query.trim().replace(/[%(),]/g, '')
        if (!term) {
          setResults([])
          return
        }
        if (filter === 'people') {
          const { data, error } = await client.from('profiles').select('id,display_name,username,avatar_url').or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20)
          if (error) throw error
          if (active) setResults((data ?? []).map((row: any) => ({ id: `profile-${row.id}`, kind: 'profile', profileId: row.id, label: row.display_name || row.username || 'Roava member', handle: row.username, avatarUrl: row.avatar_url })))
        } else {
          const { data, error } = await client.from('clubs').select('id,name,badge_url').ilike('name', `%${term}%`).limit(20)
          if (error) throw error
          if (active) setResults((data ?? []).map((row: any) => ({ id: `club-${row.id}`, kind: 'club', clubId: row.id, label: row.name, handle: row.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'club', avatarUrl: row.badge_url })))
        }
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = setTimeout(() => { void search() }, 180)
    return () => { active = false; clearTimeout(timer) }
  }, [client, visible, query, filter])

  const choose = (tag: TagSelection) => {
    if (mode === 'mentions') {
      onMentionSelected?.(tag)
      onClose()
      return
    }
    const exists = selected.some((item) => item.id === tag.id)
    onChange(exists ? selected.filter((item) => item.id !== tag.id) : [...selected, tag])
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={background} borderColor={border} maxHeight="92%" accessibilityLabel={mode === 'mentions' ? 'Mention someone' : 'Tag people or clubs'}>
      <View style={[styles.root, { backgroundColor: background }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable onPress={onClose} accessibilityLabel="Close tag picker"><Ionicons name="close" size={23} color={foreground} /></Pressable>
          <Text style={[styles.title, { color: foreground }]}>{mode === 'mentions' ? 'Mention someone' : 'Tag people or clubs'}</Text>
          <Pressable onPress={onClose} accessibilityLabel="Done tagging"><Text style={styles.done}>Done</Text></Pressable>
        </View>
        <View style={[styles.searchBox, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="search" size={18} color={muted} />
          <TextInput value={query} onChangeText={setQuery} autoFocus={mode === 'mentions'} placeholder={filter === 'people' ? 'Search username or name' : 'Search clubs'} placeholderTextColor={muted} style={[styles.input, { color: foreground }]} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.filters}>{(['people', 'clubs'] as const).map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { borderColor: border }, filter === value && styles.filterSelected]}><Text style={[styles.filterText, { color: filter === value ? '#FFFFFF' : foreground }]}>{value === 'people' ? 'People' : 'Clubs'}</Text></Pressable>)}</View>
        <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading && <ActivityIndicator color={orange} style={{ marginTop: 24 }} />}
          {!loading && !!query.trim() && !results.length && <Text style={[styles.empty, { color: muted }]}>No matches found.</Text>}
          {results.map((tag) => {
            const checked = selected.some((item) => item.id === tag.id)
            return <Pressable key={tag.id} onPress={() => choose(tag)} style={[styles.result, { backgroundColor: surface, borderColor: border }]} accessibilityRole="button" accessibilityLabel={`Tag ${tag.label}`}>
              {tag.avatarUrl ? <Image source={{ uri: tag.avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: '#FF790022' }]}><Text style={styles.initials}>{initials(tag.label)}</Text></View>}
              <View style={{ flex: 1 }}><Text style={[styles.label, { color: foreground }]} numberOfLines={1}>{tag.label}</Text><Text style={[styles.handle, { color: muted }]} numberOfLines={1}>{tag.kind === 'profile' ? `@${tag.handle || 'member'}` : 'Club'}</Text></View>
              <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={checked ? orange : muted} />
            </Pressable>
          })}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '900' },
  done: { color: orange, fontSize: 14, fontWeight: '900' },
  searchBox: { margin: 16, minHeight: 48, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, fontSize: 14 },
  filters: { flexDirection: 'row', gap: 9, paddingHorizontal: 16, paddingBottom: 6 },
  filter: { minHeight: 38, paddingHorizontal: 17, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterSelected: { backgroundColor: orange, borderColor: orange },
  filterText: { fontSize: 12, fontWeight: '800' },
  content: { padding: 16, gap: 9 },
  result: { minHeight: 68, padding: 11, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  initials: { color: orange, fontWeight: '900', fontSize: 13 },
  label: { fontSize: 14, fontWeight: '800' },
  handle: { fontSize: 11, marginTop: 3 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 13 },
})
