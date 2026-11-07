import { useState, type ComponentProps, type ReactNode } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type ImageSourcePropType } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LEGAL_DOCUMENT_VERSION } from './supabase'

const AUTH_HERO_IMAGE = require('../assets/auth-hero.jpeg')
const AUTH_LOGO = require('../assets/fithive-wordmark-transparent.png')

type AccountKind = 'member' | 'club_owner'

export function AuthScreen({ client }: { client: SupabaseClient | null }) {
  const { width } = useWindowDimensions()
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
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canSubmit = !busy && (mode === 'sign_up' || (email.trim().length > 0 && password.length > 0))

  const resetPassword = async () => {
    setError('')
    setMessage('')
    if (!client) return
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.')
      return
    }
    setBusy(true)
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim())
      if (resetError) throw resetError
      setMessage('Check your email for a secure password reset link.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send a password reset email.')
    } finally {
      setBusy(false)
    }
  }

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
      <AuthBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.fallbackPage}>
            <BrandBanner width={width} />
            <View style={styles.fallbackSurface}>
              <Text style={styles.heading}>Connect your account service</Text>
              <Text style={styles.supportingText}>Set your Supabase environment values, then restart Expo to connect FitHive.</Text>
            </View>
          </View>
        </SafeAreaView>
        <StatusBar style="light" />
      </AuthBackground>
    )
  }

  return (
    <AuthBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <BrandBanner width={width} />
            </View>
            <View style={styles.spacer} />
            <View style={styles.formSurface}>
        <Text style={styles.heading}>{mode === 'sign_in' ? 'Welcome back.' : 'Join the community.'}</Text>
        <Text style={styles.supportingText}>{mode === 'sign_in' ? 'Your next adventure starts here.' : 'Create your account and go further together.'}</Text>
        {mode === 'sign_up' && (
          <>
            <View style={styles.accountSwitch}>
              {(['member', 'club_owner'] as const).map((kind) => (
                <Pressable key={kind} onPress={() => setAccountKind(kind)} style={[styles.accountButton, accountKind === kind && styles.selectedAccount]}>
                  <Text style={[styles.accountLabel, accountKind === kind && styles.selectedLabel]}>{kind === 'member' ? 'Member' : 'Club owner'}</Text>
                </Pressable>
              ))}
            </View>
            <AuthInput value={name} onChangeText={setName} placeholder="Full name" autoComplete="name" />
            <AuthInput
              value={username}
              onChangeText={(value) => setUsername(value.replace(/^@/, '').toLowerCase())}
              placeholder="@username"
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              icon="person-outline"
            />
            {accountKind === 'club_owner' && <AuthInput value={organization} onChangeText={setOrganization} placeholder="Club or organization name" />}
          </>
        )}
        <AuthInput value={email} onChangeText={setEmail} placeholder="Email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <View style={styles.passwordWrap}>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={19} color={colors.white} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" placeholderTextColor={colors.placeholder} secureTextEntry={!showPassword} autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} style={[styles.input, styles.passwordInput]} />
          </View>
          <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.passwordToggle} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button">
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.placeholder} />
          </Pressable>
        </View>
        {mode === 'sign_in' && <Pressable onPress={() => { void resetPassword() }} disabled={busy} style={styles.forgotButton}><Text style={styles.orangeText}>Forgot password?</Text></Pressable>}
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
        <View style={{ width: '100%', height: 56, minHeight: 56, marginTop: 16, marginBottom: 20, borderRadius: 28, overflow: 'hidden', backgroundColor: '#FF7900' }}>
          <Pressable
            onPress={() => { if (canSubmit) void submit() }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={mode === 'sign_in' ? 'Sign in' : 'Create account'}
            style={({ pressed }) => ({
              flex: 1,
              width: '100%',
              height: 56,
              minHeight: 56,
              backgroundColor: '#FF7900',
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : (busy ? 0.65 : 1),
            })}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
                {mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </Pressable>
        </View>
        <Pressable onPress={() => { setError(''); setMessage(''); setMode((current) => current === 'sign_in' ? 'sign_up' : 'sign_in') }}>
          <Text style={styles.signupText}>{mode === 'sign_in' ? 'New here? ' : 'Already have an account? '}<Text style={styles.orangeText}>{mode === 'sign_in' ? 'Create an account' : 'Sign in'}</Text></Text>
        </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <StatusBar style="light" />
    </AuthBackground>
  )
}

function BrandBanner({ width }: { width: number }) {
  return (
    <View style={styles.brandBanner}>
      <Image
        source={AUTH_LOGO}
        resizeMode="contain"
        style={{ width: Math.min(width - 80, 280), height: 125 }}
        accessibilityLabel="FitHive"
      />
    </View>
  )
}

function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.background}>
      <FocalBackground source={AUTH_HERO_IMAGE} focalX={0.5} focalY={0.55} zoom={1} />
      <Svg pointerEvents="none" style={[StyleSheet.absoluteFill]} width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="authShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.15} />
            <Stop offset="35%" stopColor="#000000" stopOpacity={0.1} />
            <Stop offset="65%" stopColor="#000000" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.8} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authShade)" />
      </Svg>
      {children}
    </View>
  )
}

function FocalBackground({ source, focalX = 0.5, focalY = 0.55, zoom = 1 }: {
  source: ImageSourcePropType
  focalX?: number
  focalY?: number
  zoom?: number
}) {
  const { width, height } = useWindowDimensions()
  const resolved = Image.resolveAssetSource(source)
  const imageWidth = resolved?.width || 1024
  const imageHeight = resolved?.height || 1536
  const scale = Math.max(width / imageWidth, height / imageHeight) * zoom
  const renderedWidth = imageWidth * scale
  const renderedHeight = imageHeight * scale
  const left = Math.min(0, Math.max(width - renderedWidth, width * 0.5 - renderedWidth * focalX))
  const top = Math.min(0, Math.max(height - renderedHeight, height * 0.45 - renderedHeight * focalY))

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={source}
        resizeMode="stretch"
        style={{ position: 'absolute', width: renderedWidth, height: renderedHeight, left, top }}
      />
    </View>
  )
}

function AuthInput({ icon, ...props }: ComponentProps<typeof TextInput> & { icon?: ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.inputContainer}>
      {!!icon && <Ionicons name={icon} size={19} color={colors.white} />}
      <TextInput {...props} placeholderTextColor={colors.placeholder} style={[styles.input, props.style]} />
    </View>
  )
}

const colors = {
  orange: '#FF9B54',
  white: '#FFFFFF',
  placeholder: '#AAB4C1',
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: '#08090B' },
  safeArea: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 18 },
  header: { alignItems: 'center', paddingTop: 30 },
  spacer: { flexGrow: 1, minHeight: 64 },
  fallbackPage: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  fallbackSurface: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 26, paddingHorizontal: 20, paddingVertical: 22, backgroundColor: 'rgba(8,9,11,0.78)' },
  brandBanner: { alignItems: 'center', paddingTop: 0, paddingBottom: 0 },
  formSurface: { backgroundColor: 'rgba(8,9,11,0.80)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 17 },
  heading: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  supportingText: { color: '#D1D5DB', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 19 },
  accountSwitch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  accountButton: { flex: 1, alignItems: 'center', borderRadius: 12, padding: 11, backgroundColor: '#ffffff14', borderWidth: 1, borderColor: '#ffffff1f' },
  selectedAccount: { backgroundColor: colors.orange, borderColor: colors.orange },
  accountLabel: { color: '#e2e7ed', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  selectedLabel: { color: '#ffffff' },
  inputContainer: { height: 54, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderRadius: 15, paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  input: { flex: 1, color: colors.white, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: 0 },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 36 },
  passwordToggle: { position: 'absolute', right: 14, top: 0, height: 54, justifyContent: 'center', paddingHorizontal: 4 },
  forgotButton: { alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 7, minHeight: 40 },
  orangeText: { color: '#FF7900', fontFamily: 'Inter_600SemiBold' },
  legalBox: { borderWidth: 1, borderColor: '#ffffff1f', borderRadius: 14, padding: 12, marginBottom: 11, backgroundColor: '#ffffff0d' },
  legalTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 12, marginTop: 4 },
  legalCopy: { color: '#cbd3dc', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 5 },
  checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  check: { color: colors.orange, fontSize: 16, lineHeight: 18 },
  checkLabel: { color: '#e1e6ec', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, flex: 1 },
  error: { color: '#ffb6b6', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginBottom: 9 },
  message: { color: '#ffc1a5', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginBottom: 9 },
  signupText: { color: '#FFFFFF', fontFamily: 'Inter_500Medium', fontSize: 14 },
})
