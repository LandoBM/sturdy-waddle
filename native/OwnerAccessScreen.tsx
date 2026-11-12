import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LEGAL_DOCUMENT_VERSION } from './supabase'

export function OwnerAccessScreen({
  client,
  status,
  onStatusChanged,
}: {
  client: SupabaseClient
  status: 'none' | 'pending' | 'verified'
  onStatusChanged: () => Promise<void>
}) {
  const [organization, setOrganization] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedOwnerDraft, setAcceptedOwnerDraft] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestAccess = async () => {
    setError('')
    setMessage('')
    if (organization.trim().length < 2 || !acceptedTerms || !acceptedOwnerDraft) {
      setError('Enter your club name and accept both safety documents to continue.')
      return
    }
    setBusy(true)
    try {
      const { error: rpcError } = await client.rpc('request_club_owner_access', {
        p_organization_name: organization.trim(),
        p_terms_version: LEGAL_DOCUMENT_VERSION,
        p_terms_accepted_at: new Date().toISOString(),
        p_owner_documents_version: LEGAL_DOCUMENT_VERSION,
        p_owner_documents_accepted_at: new Date().toISOString(),
      })
      if (rpcError) throw rpcError
      await onStatusChanged()
      setMessage('Your verified email has been used to certify owner access. This email-only check does not verify legal ownership of an organization.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not request owner access.')
    } finally {
      setBusy(false)
    }
  }

  const checkEmail = async () => {
    setError('')
    setBusy(true)
    try {
      const { error: rpcError } = await client.rpc('verify_pending_club_owner_email')
      if (rpcError) throw rpcError
      await onStatusChanged()
      setMessage('Owner status refreshed. Verify your sign-in email first if access is still pending.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh owner status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Club owner access</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>STATUS</Text>
        <Text style={styles.status}>{status === 'verified' ? 'Email verified' : status === 'pending' ? 'Email confirmation required' : 'Not certified'}</Text>
        <Text style={styles.copy}>Club publishing, member approvals, and club updates stay locked until your account email is confirmed and owner access is certified.</Text>
      </View>
      {status !== 'verified' && (
        <View style={styles.card}>
          <Text style={styles.heading}>Certify this account as a club owner</Text>
          <Text style={styles.copy}>This project currently uses email confirmation only. It does not verify that you legally represent a club or organization.</Text>
          <TextInput value={organization} onChangeText={setOrganization} placeholder="Club or organization name" style={styles.input} />
          <Text style={styles.legal}>The terms and club-owner safety documents are not legal advice or a finalized waiver. Have qualified counsel review and approve them before use.</Text>
          <Pressable onPress={() => setAcceptedTerms((value) => !value)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }}>
            <Text style={styles.check}>{acceptedTerms ? '☑' : '□'}</Text>
            <Text style={styles.checkLabel}>I reviewed and accept the terms, version {LEGAL_DOCUMENT_VERSION}.</Text>
          </Pressable>
          <Pressable onPress={() => setAcceptedOwnerDraft((value) => !value)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedOwnerDraft }}>
            <Text style={styles.check}>{acceptedOwnerDraft ? '☑' : '□'}</Text>
            <Text style={styles.checkLabel}>I reviewed and accept the club-owner documents.</Text>
          </Pressable>
          <Pressable onPress={() => { void requestAccess() }} disabled={busy} style={[styles.button, busy && styles.disabled]}>
            <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Request owner access'}</Text>
          </Pressable>
          {status === 'pending' && <Pressable onPress={() => { void checkEmail() }} disabled={busy} style={styles.secondaryButton}><Text style={styles.secondaryText}>I confirmed my email · refresh status</Text></Pressable>}
        </View>
      )}
      {status === 'verified' && <View style={styles.card}><Text style={styles.heading}>Owner access is enabled</Text><Text style={styles.copy}>You can now create club pages, review membership requests, and publish club updates.</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 32, gap: 12 },
  eyebrow: { color: '#73776d', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#151712', fontSize: 27, fontWeight: '800' },
  card: { padding: 15, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dedfd7' },
  statusCard: { padding: 15, backgroundColor: '#d9ff5a', borderRadius: 18 },
  statusLabel: { color: '#4d5830', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  status: { color: '#151712', fontSize: 16, fontWeight: '800', marginTop: 4 },
  heading: { color: '#151712', fontSize: 15, fontWeight: '800' },
  copy: { color: '#73776d', fontSize: 11, lineHeight: 16, marginTop: 6 },
  input: { height: 45, borderWidth: 1, borderColor: '#dedfd7', borderRadius: 12, paddingHorizontal: 12, marginTop: 13, color: '#151712' },
  legal: { color: '#73776d', fontSize: 10, lineHeight: 15, marginTop: 12 },
  checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  check: { color: '#151712', fontSize: 16, lineHeight: 18 },
  checkLabel: { color: '#151712', fontSize: 10, lineHeight: 15, flex: 1 },
  button: { minHeight: 45, backgroundColor: '#d9ff5a', borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  buttonText: { color: '#151712', fontSize: 12, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', padding: 10 },
  secondaryText: { color: '#151712', fontSize: 10, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { color: '#a32020', fontSize: 11, lineHeight: 16 },
  message: { color: '#325a18', fontSize: 11, lineHeight: 16 },
})
