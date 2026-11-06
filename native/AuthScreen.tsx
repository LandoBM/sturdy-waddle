import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Ionicons } from '@expo/vector-icons'
import { LEGAL_DOCUMENT_VERSION } from './supabase'

type AccountKind = 'member' | 'club_owner'

export function AuthScreen({ client }: { client: SupabaseClient | null }) {
  const pulse = useRef(new Animated.Value(1)).current
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [accountKind, setAccountKind] = useState<AccountKind>('member')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedOwnerDraft, setAcceptedOwnerDraft] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]))
    animation.start()
    return () => animation.stop()
  }, [pulse])

  const submit = async () => {
    setError('')
    setMessage('')
    if (!client) return
    const normalizedUsername = username.trim().replace(/^@/, '').toLowerCase()
    if (mode === 'sign_up' && (!name.trim() || !email.trim() || password.length < 8)) {
      setError('Enter your name and email, and a password with at least 8 characters.')
      return
    }
    if (mode === 'sign_up' && !/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      setError('Choose a username with 3–20 letters, numbers, or underscores.')
      return
    }
    if (mode === 'sign_up' && accountKind === 'club_owner' && !organization.trim()) {
      setError('Enter the organization or club name you represent.')
      return
    }
    if (mode === 'sign_up' && !acceptedTerms) {
      setError('Review and accept the draft terms to continue.')
      return
    }
    if (mode === 'sign_up' && accountKind === 'club_owner' && !acceptedOwnerDraft) {
      setError('Review and accept the draft club-owner documents to continue.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'sign_in') {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      } else {
        const { data: usernameAvailable, error: usernameError } = await client.rpc('is_username_available', {
          candidate: normalizedUsername,
        })
        if (usernameError) {
          throw new Error(`Could not check username availability. Apply the username migration in Supabase, then try again. ${usernameError.message}`)
        }
        if (!usernameAvailable) {
          throw new Error('That username is already taken. Choose another one.')
        }
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim(),
              username: normalizedUsername,
              account_type: accountKind,
              organization_name: organization.trim(),
              terms_version: LEGAL_DOCUMENT_VERSION,
              terms_accepted_at: new Date().toISOString(),
              owner_documents_version: accountKind === 'club_owner' ? LEGAL_DOCUMENT_VERSION : null,
              owner_documents_accepted_at: accountKind === 'club_owner' ? new Date().toISOString() : null,
            },
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setMessage('Check your email for the confirmation link. Your account becomes active after you confirm it.')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!client) {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <BrandBanner pulse={pulse} />
          <Text style={styles.title}>Connect your account service</Text>
          <Text style={styles.copy}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in fitapp/.env, then restart Expo. See the setup guide for the database migration.</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <BrandBanner pulse={pulse} />
        <Text style={styles.title}>{mode === 'sign_in' ? 'Welcome back.' : 'Join the community.'}</Text>
        <Text style={styles.copy}>{mode === 'sign_in' ? 'Sign in to continue to your outdoor life.' : 'Create an account to find clubs and track activities.'}</Text>
        {mode === 'sign_up' && (
          <>
            <View style={styles.accountSwitch}>
              {(['member', 'club_owner'] as const).map((kind) => (
                <Pressable key={kind} onPress={() => setAccountKind(kind)} style={[styles.accountButton, accountKind === kind && styles.selectedAccount]}>
                  <Text style={[styles.accountLabel, accountKind === kind && styles.selectedLabel]}>{kind === 'member' ? 'Member' : 'Club owner'}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={name} onChangeText={setName} placeholder="Full name" autoComplete="name" style={styles.input} />
            <TextInput
              value={username}
              onChangeText={(value) => setUsername(value.replace(/^@/, '').toLowerCase())}
              placeholder="@username"
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={styles.input}
            />
            {accountKind === 'club_owner' && <TextInput value={organization} onChangeText={setOrganization} placeholder="Club or organization name" style={styles.input} />}
          </>
        )}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" secureTextEntry autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} style={styles.input} />
        {mode === 'sign_up' && (
          <View style={styles.legalBox}>
            <Text style={styles.legalTitle}>Draft terms and safety notice</Text>
            <Text style={styles.legalCopy}>These documents are placeholders, not legal advice or a finalized waiver. They do not promise to release FitHive or its developers from liability. Have qualified counsel review and replace this draft before launch.</Text>
            <Pressable onPress={() => setAcceptedTerms((value) => !value)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }}>
              <Text style={styles.check}>{acceptedTerms ? '☑' : '□'}</Text>
              <Text style={styles.checkLabel}>I have reviewed and accept the draft terms (version {LEGAL_DOCUMENT_VERSION}).</Text>
            </Pressable>
            {accountKind === 'club_owner' && (
              <>
                <Text style={styles.legalTitle}>Club-owner responsibilities (draft)</Text>
                <Text style={styles.legalCopy}>Club owners are responsible for accurate event details, member communications, and appropriate safety planning. This draft must be replaced with counsel-approved documents.</Text>
                <Pressable onPress={() => setAcceptedOwnerDraft((value) => !value)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedOwnerDraft }}>
                  <Text style={styles.check}>{acceptedOwnerDraft ? '☑' : '□'}</Text>
                  <Text style={styles.checkLabel}>I have reviewed and accept the draft club-owner documents.</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
        <Pressable onPress={() => { void submit() }} disabled={busy} style={[styles.submit, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#151712" /> : <Text style={styles.submitLabel}>{mode === 'sign_in' ? 'Sign in' : 'Create account'}</Text>}
        </Pressable>
        <Pressable onPress={() => { setError(''); setMessage(''); setMode((current) => current === 'sign_in' ? 'sign_up' : 'sign_in') }}>
          <Text style={styles.modeLink}>{mode === 'sign_in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

function BrandBanner({ pulse }: { pulse: Animated.Value }) {
  return (
    <View style={styles.brandBanner}>
      <Animated.View style={[styles.brandIcon, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="fitness" size={25} color="#32135e" />
      </Animated.View>
      <View>
        <Text style={styles.brand}>FitHive</Text>
        <Text style={styles.tagline}>The Gateway of Fitness to All</Text>
      </View>
      <View style={styles.brandDot} />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', backgroundColor: '#27134b', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 25, borderWidth: 1, borderColor: '#ffffff88', padding: 20, shadowColor: '#100722', shadowOpacity: 0.25, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  brandBanner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#6335d4', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 13, overflow: 'hidden' },
  brandIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9ff55' },
  brand: { color: '#fff', fontFamily: 'serif', fontSize: 23, fontWeight: '700', letterSpacing: 0.3 },
  tagline: { color: '#f4eaff', fontSize: 10, fontWeight: '600', marginTop: 4 },
  brandDot: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#ff9b70', opacity: 0.34, right: -25, top: -31 },
  title: { color: '#151712', fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 16 },
  copy: { color: '#73776d', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 17 },
  accountSwitch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  accountButton: { flex: 1, alignItems: 'center', borderRadius: 13, padding: 11, backgroundColor: '#f0f1eb' },
  selectedAccount: { backgroundColor: '#d9ff5a' },
  accountLabel: { color: '#73776d', fontWeight: '700', fontSize: 12 },
  selectedLabel: { color: '#151712' },
  input: { height: 48, borderWidth: 1, borderColor: '#dedfd7', backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 13, marginBottom: 10, color: '#151712' },
  legalBox: { borderWidth: 1, borderColor: '#dedfd7', borderRadius: 14, padding: 12, marginBottom: 11, backgroundColor: '#f8f9f4' },
  legalTitle: { color: '#151712', fontWeight: '800', fontSize: 12, marginTop: 4 },
  legalCopy: { color: '#73776d', fontSize: 10, lineHeight: 15, marginTop: 5 },
  checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  check: { color: '#151712', fontSize: 16, lineHeight: 18 },
  checkLabel: { color: '#151712', fontSize: 10, lineHeight: 15, flex: 1 },
  error: { color: '#a32020', fontSize: 11, lineHeight: 16, marginBottom: 9 },
  message: { color: '#325a18', fontSize: 11, lineHeight: 16, marginBottom: 9 },
  submit: { minHeight: 48, borderRadius: 24, backgroundColor: '#d9ff5a', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  submitLabel: { color: '#151712', fontWeight: '800', fontSize: 13 },
  disabled: { opacity: 0.6 },
  modeLink: { color: '#151712', fontWeight: '700', fontSize: 11, textAlign: 'center', marginTop: 16 },
})
