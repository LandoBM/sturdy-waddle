import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ClubRow {
  id: string
  name: string
  description: string
  activity: string
  location: string
}

interface MembershipRequest {
  id: string
  club_id: string
  member_id: string
  created_at: string
}

export function OwnerTools({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [clubName, setClubName] = useState('')
  const [description, setDescription] = useState('')
  const [activity, setActivity] = useState('')
  const [location, setLocation] = useState('')
  const [updateText, setUpdateText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    const { data: ownClubs, error: clubsError } = await client.from('clubs')
      .select('id,name,description,activity,location').eq('owner_id', userId).order('created_at', { ascending: false })
    if (clubsError) throw clubsError
    const clubRows = (ownClubs ?? []) as ClubRow[]
    setClubs(clubRows)
    setSelectedClubId((current) => clubRows.some((club) => club.id === current) ? current : clubRows[0]?.id ?? '')
    if (clubRows.length) {
      const { data, error: requestsError } = await client.from('club_memberships')
        .select('id,club_id,member_id,created_at')
        .in('club_id', clubRows.map((club) => club.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (requestsError) throw requestsError
      setRequests((data ?? []) as MembershipRequest[])
    } else {
      setRequests([])
    }
  }, [client, userId])

  useEffect(() => {
    refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load club tools.'))
  }, [refresh])

  const createClub = async () => {
    setError('')
    setMessage('')
    if (clubName.trim().length < 2) {
      setError('Enter a club name with at least two characters.')
      return
    }
    setBusy(true)
    try {
      const { error: insertError } = await client.from('clubs').insert({
        owner_id: userId,
        name: clubName.trim(),
        description: description.trim(),
        activity: activity.trim(),
        location: location.trim(),
      })
      if (insertError) throw insertError
      setClubName('')
      setDescription('')
      setActivity('')
      setLocation('')
      setMessage('Club page created.')
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create club page.')
    } finally {
      setBusy(false)
    }
  }

  const saveClub = async (club: ClubRow) => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const { error: updateError } = await client.from('clubs').update({
        name: club.name.trim(),
        description: club.description.trim(),
        activity: club.activity.trim(),
        location: club.location.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', club.id)
      if (updateError) throw updateError
      setMessage('Club page saved.')
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save club page.')
    } finally {
      setBusy(false)
    }
  }

  const publishUpdate = async () => {
    setError('')
    setMessage('')
    if (!selectedClubId || !updateText.trim()) {
      setError('Choose a club and write an update first.')
      return
    }
    setBusy(true)
    try {
      const { error: insertError } = await client.from('club_updates').insert({
        club_id: selectedClubId,
        author_id: userId,
        body: updateText.trim(),
      })
      if (insertError) throw insertError
      setUpdateText('')
      setMessage('Club update published.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish update.')
    } finally {
      setBusy(false)
    }
  }

  const decideMembership = async (request: MembershipRequest, status: 'active' | 'rejected') => {
    setError('')
    setBusy(true)
    try {
      const { error: updateError } = await client.from('club_memberships').update({ status }).eq('id', request.id)
      if (updateError) throw updateError
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update membership request.')
    } finally {
      setBusy(false)
    }
  }

  const updateClubField = (id: string, field: keyof Omit<ClubRow, 'id'>, value: string) => {
    setClubs((current) => current.map((club) => club.id === id ? { ...club, [field]: value } : club))
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Club management</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Create a club page</Text>
        <TextInput value={clubName} onChangeText={setClubName} placeholder="Club name" style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="About this club" multiline style={[styles.input, styles.multiline]} />
        <TextInput value={activity} onChangeText={setActivity} placeholder="Main activity (e.g. Hiking)" style={styles.input} />
        <TextInput value={location} onChangeText={setLocation} placeholder="City or area" style={styles.input} />
        <Pressable onPress={() => { void createClub() }} disabled={busy} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Saving…' : 'Create club'}</Text></Pressable>
      </View>
      {clubs.map((club) => (
        <View key={club.id} style={styles.card}>
          <Text style={styles.heading}>Edit club page</Text>
          <TextInput value={club.name} onChangeText={(value) => updateClubField(club.id, 'name', value)} style={styles.input} />
          <TextInput value={club.description} onChangeText={(value) => updateClubField(club.id, 'description', value)} placeholder="About this club" multiline style={[styles.input, styles.multiline]} />
          <TextInput value={club.activity} onChangeText={(value) => updateClubField(club.id, 'activity', value)} placeholder="Main activity" style={styles.input} />
          <TextInput value={club.location} onChangeText={(value) => updateClubField(club.id, 'location', value)} placeholder="City or area" style={styles.input} />
          <Pressable onPress={() => { void saveClub(club) }} disabled={busy} style={styles.secondaryButton}><Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save changes'}</Text></Pressable>
        </View>
      ))}
      <View style={styles.card}>
        <Text style={styles.heading}>Publish a club update</Text>
        {clubs.length ? (
          <>
            <View style={styles.clubChoices}>
              {clubs.map((club) => <Pressable key={club.id} onPress={() => setSelectedClubId(club.id)} style={[styles.clubChoice, selectedClubId === club.id && styles.selectedChoice]}><Text style={styles.choiceText}>{club.name}</Text></Pressable>)}
            </View>
            <TextInput value={updateText} onChangeText={setUpdateText} placeholder="Share news with your members" multiline style={[styles.input, styles.multiline]} />
            <Pressable onPress={() => { void publishUpdate() }} disabled={busy} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Publishing…' : 'Post update'}</Text></Pressable>
          </>
        ) : <Text style={styles.copy}>Create a club page before publishing updates.</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Membership requests · {requests.length}</Text>
        {requests.length ? requests.map((request) => (
          <View key={request.id} style={styles.requestRow}>
            <Text style={styles.copy}>{clubs.find((club) => club.id === request.club_id)?.name ?? 'Club'} · member {request.member_id.slice(0, 8)}</Text>
            <View style={styles.requestActions}>
              <Pressable onPress={() => { void decideMembership(request, 'active') }} disabled={busy} style={styles.approveButton}><Text style={styles.buttonText}>Accept</Text></Pressable>
              <Pressable onPress={() => { void decideMembership(request, 'rejected') }} disabled={busy} style={styles.rejectButton}><Text style={styles.rejectText}>Decline</Text></Pressable>
            </View>
          </View>
        )) : <Text style={styles.copy}>No pending membership requests.</Text>}
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 32, gap: 12 },
  eyebrow: { color: '#73776d', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#151712', fontSize: 27, fontWeight: '800' },
  card: { padding: 14, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dedfd7' },
  heading: { color: '#151712', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  copy: { color: '#73776d', fontSize: 10, lineHeight: 15 },
  input: { minHeight: 43, borderWidth: 1, borderColor: '#dedfd7', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9, marginTop: 8, color: '#151712', fontSize: 12 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  button: { minHeight: 43, backgroundColor: '#d9ff5a', borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryButton: { minHeight: 40, backgroundColor: '#e8eadf', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#151712', fontWeight: '800', fontSize: 11 },
  clubChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  clubChoice: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15, backgroundColor: '#f0f1eb' },
  selectedChoice: { backgroundColor: '#d9ff5a' },
  choiceText: { color: '#151712', fontSize: 10, fontWeight: '700' },
  requestRow: { borderTopWidth: 1, borderColor: '#dedfd7', paddingTop: 10, marginTop: 10 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#d9ff5a' },
  rejectButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f0f1eb' },
  rejectText: { color: '#a32020', fontSize: 10, fontWeight: '700' },
  error: { color: '#a32020', fontSize: 11, lineHeight: 16 },
  message: { color: '#325a18', fontSize: 11, lineHeight: 16 },
})
