import { Blob as ExpoBlob } from 'expo-blob'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'

type EditableClub = { id: string; name: string; description: string; activity: string; location: string; visibility?: string | null; background_color?: string | null; coverPath?: string | null; badgePath?: string | null; coverUrl?: string | null; badgeUrl?: string | null }
const colors = ['#17191D', '#090A0C', '#C2410C', '#14532D', '#1E3A5F', '#4C1D95']
const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxBytes = 10 * 1024 * 1024

function extensionFor(mimeType: string) { return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg' }

export function EditClubScreen({ client, club, darkMode, onCancel, onSaved, onDirtyChange, AppIcon }: { client: SupabaseClient; club: EditableClub; darkMode: boolean; onCancel: () => void; onSaved: () => void; onDirtyChange: (dirty: boolean) => void; AppIcon: (props: any) => React.ReactNode }) {
  const [name, setName] = useState(club.name)
  const [description, setDescription] = useState(club.description)
  const [sport, setSport] = useState(club.activity)
  const [location, setLocation] = useState(club.location)
  const [visibility, setVisibility] = useState(club.visibility === 'private' ? 'private' : 'public')
  const [backgroundColor, setBackgroundColor] = useState(club.background_color || colors[0])
  const [coverUri, setCoverUri] = useState<string | null>(null)
  const [badgeUri, setBadgeUri] = useState<string | null>(null)
  const [coverMime, setCoverMime] = useState('image/jpeg')
  const [badgeMime, setBadgeMime] = useState('image/jpeg')
  const [removeCover, setRemoveCover] = useState(false)
  const [removeBadge, setRemoveBadge] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selecting, setSelecting] = useState<'cover' | 'badge' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const foreground = darkMode ? '#F5F5F5' : '#171C19'
  const muted = darkMode ? '#A1A1AA' : '#68736B'
  const background = darkMode ? '#090A0C' : '#F5F6F2'
  const surface = darkMode ? '#17191D' : '#FFFFFF'
  const elevated = darkMode ? '#24262B' : '#F8FAF7'
  const border = darkMode ? '#303238' : '#E7EAE4'
  const dirty = name !== club.name || description !== club.description || sport !== club.activity || location !== club.location || visibility !== (club.visibility === 'private' ? 'private' : 'public') || backgroundColor !== (club.background_color || colors[0]) || !!coverUri || !!badgeUri || removeCover || removeBadge

  const notifyDirty = (next: boolean) => onDirtyChange(next)
  const change = (setter: (value: string) => void, value: string) => { setter(value); notifyDirty(true) }

  const pickImage = async (kind: 'cover' | 'badge') => {
    setSelecting(kind)
    setError('')
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) throw new Error('Allow photo access in device settings to choose club media.')
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ('images')[], allowsEditing: true, aspect: kind === 'badge' ? [1, 1] : [16, 9], quality: 0.85 })
      const asset = result.canceled ? null : result.assets[0]
      if (!asset?.uri) return
      const mimeType = asset.mimeType && supportedMimeTypes.includes(asset.mimeType) ? asset.mimeType : 'image/jpeg'
      if (asset.fileSize && asset.fileSize > maxBytes) throw new Error('Choose an image smaller than 10 MB.')
      if (kind === 'cover') { setCoverUri(asset.uri); setCoverMime(mimeType); setRemoveCover(false) }
      else { setBadgeUri(asset.uri); setBadgeMime(mimeType); setRemoveBadge(false) }
      notifyDirty(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to select club media.')
    } finally { setSelecting(null) }
  }

  const upload = async (uri: string, mimeType: string, kind: 'cover' | 'badge') => {
    const response = await fetch(uri)
    if (!response.ok) throw new Error('Could not read the selected image. Choose it again and retry.')
    const media = new ExpoBlob([await response.arrayBuffer()], { type: mimeType })
    if (media.size > maxBytes) throw new Error('Choose an image smaller than 10 MB.')
    const path = `${club.id}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensionFor(mimeType)}`
    const { error: uploadError } = await client.storage.from('club-media').upload(path, media, { contentType: mimeType, upsert: false })
    if (uploadError) throw new Error(`Could not upload ${kind}: ${uploadError.message}`)
    return path
  }

  const removeStoredObject = async (path: string | null | undefined) => {
    if (!path || path.startsWith('http')) return
    const { error: removeError } = await client.storage.from('club-media').remove([path])
    if (removeError) throw removeError
  }

  const save = async () => {
    if (name.trim().length < 2) { setError('Club names must be at least two characters.'); return }
    setSaving(true); setError(''); setMessage('')
    const uploaded: string[] = []
    try {
      setMessage('Uploading selected media…')
      const nextCoverPath = coverUri ? await upload(coverUri, coverMime, 'cover') : removeCover ? null : club.coverPath ?? null
      if (coverUri && nextCoverPath) uploaded.push(nextCoverPath)
      const nextBadgePath = badgeUri ? await upload(badgeUri, badgeMime, 'badge') : removeBadge ? null : club.badgePath ?? null
      if (badgeUri && nextBadgePath) uploaded.push(nextBadgePath)
      setMessage('Saving club changes…')
      const { error: updateError } = await client.from('clubs').update({ name: name.trim(), description: description.trim(), activity: sport.trim(), sport_id: sport.trim() || null, location: location.trim(), visibility, background_color: backgroundColor, cover_image_url: nextCoverPath, badge_url: nextBadgePath }).eq('id', club.id)
      if (updateError) throw updateError
      try { if (removeCover || coverUri) await removeStoredObject(club.coverPath); if (removeBadge || badgeUri) await removeStoredObject(club.badgePath) } catch (cleanupError) { setMessage(`Club saved, but an older image could not be removed: ${cleanupError instanceof Error ? cleanupError.message : 'try again later.'}`) }
      onDirtyChange(false)
      onSaved()
    } catch (caught) {
      await Promise.all(uploaded.map((path) => client.storage.from('club-media').remove([path]).then(() => undefined).catch(() => undefined)))
      setMessage('')
      setError(caught instanceof Error ? caught.message : 'Could not save club changes.')
    } finally { setSaving(false) }
  }

  const requestClose = onCancel
  const Field = ({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) => <View style={{ marginBottom: 14 }}><Text style={{ color: muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 6 }}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={muted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={{ minHeight: multiline ? 92 : 48, color: foreground, backgroundColor: elevated, borderColor: border, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: multiline ? 12 : 0, fontSize: 13 }} /></View>
  const previewCover = coverUri || (removeCover ? null : club.coverUrl)
  const previewBadge = badgeUri || (removeBadge ? null : club.badgeUrl)

  return <View style={{ flex: 1, backgroundColor: background }}><View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: border }}><Pressable onPress={requestClose} accessibilityLabel="Cancel club edits"><AppIcon name="close" color={foreground} size={24} /></Pressable><Text style={{ color: foreground, fontSize: 18, fontWeight: '900' }}>Edit club</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} keyboardShouldPersistTaps="handled"><Text style={{ color: muted, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>Changes stay local until you save. New media is uploaded only after validation.</Text><View style={{ height: 156, borderRadius: 22, overflow: 'hidden', backgroundColor: backgroundColor, marginBottom: 12 }}>{previewCover && <Image source={{ uri: previewCover }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.66 }} resizeMode="cover" />}<View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: '#090A0C99' }}><Text style={{ color: '#FF8A3D', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{(sport || 'SPORTS CLUB').toUpperCase()}</Text><Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 4 }}>{name || 'Club name'}</Text><Text style={{ color: '#F5F5F5', fontSize: 11, marginTop: 3 }}>{location || 'Location not provided'}</Text></View></View><View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}><Pressable onPress={() => { void pickImage('cover') }} disabled={!!selecting || saving} style={{ flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: elevated, borderWidth: 1, borderColor: border }}><Text style={{ color: foreground, fontSize: 11, fontWeight: '800' }}>{selecting === 'cover' ? 'Selecting…' : 'Change cover'}</Text></Pressable><Pressable onPress={() => { setCoverUri(null); setRemoveCover(true); notifyDirty(true) }} disabled={!previewCover || saving} style={{ minHeight: 42, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 21, borderWidth: 1, borderColor: border, opacity: previewCover ? 1 : 0.45 }}><Text style={{ color: muted, fontSize: 11, fontWeight: '800' }}>Remove</Text></Pressable></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}><View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: elevated, borderWidth: 3, borderColor: '#FF8A3D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{previewBadge ? <Image source={{ uri: previewBadge }} style={{ width: '100%', height: '100%' }} /> : <AppIcon name="people" size={26} color="#FF5A1F" />}</View><View style={{ flex: 1 }}><Text style={{ color: foreground, fontSize: 13, fontWeight: '900' }}>Club badge</Text><Text style={{ color: muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>Use a square image for the best circular preview.</Text></View><View style={{ gap: 7 }}><Pressable onPress={() => { void pickImage('badge') }} disabled={!!selecting || saving} style={{ paddingHorizontal: 12, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#FF5A1F' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>{selecting === 'badge' ? 'Selecting…' : 'Change'}</Text></Pressable><Pressable onPress={() => { setBadgeUri(null); setRemoveBadge(true); notifyDirty(true) }} disabled={!previewBadge || saving} style={{ paddingHorizontal: 12, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: border, opacity: previewBadge ? 1 : 0.45 }}><Text style={{ color: muted, fontSize: 10, fontWeight: '800' }}>Remove</Text></Pressable></View></View><Field label="CLUB NAME" value={name} onChange={(value) => change(setName, value)} placeholder="Club name" /><Field label="DESCRIPTION" value={description} onChange={(value) => change(setDescription, value)} placeholder="Tell people about this club" multiline /><Field label="SPORT" value={sport} onChange={(value) => change(setSport, value)} placeholder="Primary sport" /><Field label="LOCATION" value={location} onChange={(value) => change(setLocation, value)} placeholder="City or region" /><Text style={{ color: muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 }}>VISIBILITY</Text><View style={{ flexDirection: 'row', gap: 9, marginBottom: 16 }}>{['public', 'private'].map((value) => <Pressable key={value} onPress={() => { setVisibility(value); notifyDirty(true) }} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: visibility === value ? '#FF5A1F' : border, backgroundColor: visibility === value ? '#FF5A1F' : elevated }}><Text style={{ color: visibility === value ? '#FFFFFF' : foreground, fontSize: 12, fontWeight: '800' }}>{value === 'public' ? 'Public' : 'Private'}</Text></Pressable>)}</View><Text style={{ color: muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 }}>HEADER COLOR</Text><View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>{colors.map((value) => <Pressable key={value} onPress={() => { setBackgroundColor(value); notifyDirty(true) }} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: value, borderWidth: backgroundColor === value ? 3 : 1, borderColor: backgroundColor === value ? '#FF8A3D' : border }} accessibilityLabel={`Use ${value} header color`} />)}</View>{!!error && <Text accessibilityRole="alert" style={{ color: '#FF8A3D', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{error}</Text>}{!!message && <Text style={{ color: '#FF8A3D', fontSize: 12, marginBottom: 12 }}>{message}</Text>}<View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={requestClose} disabled={saving} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 1, borderColor: border, backgroundColor: elevated }}><Text style={{ color: foreground, fontWeight: '900' }}>Cancel</Text></Pressable><Pressable onPress={() => { void save() }} disabled={saving || !dirty} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#FF5A1F', opacity: saving || !dirty ? 0.55 : 1 }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable></View></ScrollView></View>
}
