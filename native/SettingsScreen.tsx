import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'

type AppearancePreference = 'system' | 'light' | 'dark'

export type SettingsScreenProps = {
  visible: boolean
  onClose: () => void
  styles: Record<string, any>
  themeBackground: string
  themeSurface: string
  themeText: string
  themeMuted: string
  themeBorder: string
  isDark: boolean
  accountUsername: string
  accountHandle: string
  email?: string
  profileAvatarUrl: string | null
  accountSettingsError: string
  healthProvider: string | null
  importedWorkouts: Array<any>
  syncingHealth: boolean
  ownerStatus: string
  appearancePreference: AppearancePreference
  setAppearance: (preference: AppearancePreference) => void
  beginProfileEdit: () => void
  connectHealthProvider: () => void
  disconnectHealthProvider: () => void
  setTab: (tab: any) => void
  signOut: () => void
  renderBottomTabs: (onNavigate: (tab: any) => void) => ReactNode
  AppIcon: (props: any) => ReactNode
  Avatar: (props: any) => ReactNode
}

export function SettingsScreen({
  visible, onClose, styles, themeBackground, themeSurface, themeText, themeMuted, themeBorder,
  isDark, accountUsername, accountHandle, email, profileAvatarUrl, accountSettingsError,
  healthProvider, importedWorkouts, syncingHealth, ownerStatus, appearancePreference,
  setAppearance, beginProfileEdit, connectHealthProvider, disconnectHealthProvider,
  setTab, signOut, renderBottomTabs, AppIcon, Avatar,
}: SettingsScreenProps) {
  const settingsSurface = { backgroundColor: themeSurface, borderColor: themeBorder }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: themeBackground }]} edges={['top', 'bottom']}>
        <View style={[styles.sheetHeader, { backgroundColor: themeSurface, borderBottomColor: themeBorder }]}>
          <Pressable onPress={onClose} accessibilityLabel="Close settings"><AppIcon name="close" /></Pressable>
          <Text style={[styles.sheetTitle, { color: themeText }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: themeBackground }} contentContainerStyle={styles.settingsContent}>
          <View style={[styles.settingsAccount, settingsSurface]}>
            <Avatar name={accountUsername} size={48} photoUri={profileAvatarUrl} />
            <View style={styles.simpleRowCopy}>
              <Text style={[styles.simpleRowTitle, { color: themeText }]}>{accountHandle}</Text>
              <Text style={[styles.simpleRowSub, { color: themeMuted }]}>{email}</Text>
            </View>
          </View>
          {!!accountSettingsError && <View style={styles.settingsWarning}><Text style={styles.settingsWarningTitle}>Account setup needs attention</Text><Text style={styles.settingsWarningText}>{accountSettingsError}</Text></View>}
          <Text style={styles.settingsSectionLabel}>ACCOUNT</Text>
          <Pressable style={[styles.settingsRow, settingsSurface]} onPress={beginProfileEdit}>
            <AppIcon name="person-circle-outline" color="#FF7900" />
            <View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Edit profile</Text><Text style={[styles.simpleRowSub, { color: themeMuted }]}>Change your photo, username, display name, and bio</Text></View>
            <AppIcon name="chevron-forward" color={themeMuted} />
          </Pressable>
          <View style={[styles.settingsRow, settingsSurface]}>
            <AppIcon name="mail-outline" color="#FF7900" />
            <View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Email address</Text><Text style={[styles.simpleRowSub, { color: themeMuted }]}>{email || 'Not available'}</Text></View>
          </View>
          <Text style={styles.settingsSectionLabel}>PREFERENCES</Text>
          <View style={[styles.appearanceCard, settingsSurface]}>
            <View style={styles.appearanceHeader}><View style={styles.appearanceIcon}><AppIcon name="contrast-outline" color="#FFFFFF" /></View><View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Appearance</Text></View></View>
            <View style={styles.appearanceOptions}>
              {([
                ['system', 'Use device settings', 'phone-portrait-outline'],
                ['light', 'Light', 'sunny-outline'],
                ['dark', 'Dark', 'moon-outline'],
              ] as const).map(([value, label, icon]) => {
                const selected = appearancePreference === value
                return <Pressable key={value} onPress={() => setAppearance(value)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.appearanceOption, { backgroundColor: isDark ? '#202823' : '#FAFBF8', borderColor: themeBorder }, selected && { backgroundColor: '#FF7900', borderColor: '#FF7900' }]}><AppIcon name={icon} size={16} color={selected ? '#FFFFFF' : themeMuted} /><Text style={[styles.appearanceOptionText, { color: selected ? '#FFFFFF' : themeMuted }, selected && styles.appearanceOptionTextSelected]}>{label}</Text></Pressable>
              })}
            </View>
          </View>
          <View style={[styles.settingsRow, settingsSurface]}><AppIcon name="heart-circle-outline" color="#FF7900" /><View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Fitness app connections</Text><Text style={[styles.simpleRowSub, { color: themeMuted }]}>{healthProvider ? `${healthProvider} connected · ${importedWorkouts.length} workouts imported` : Platform.OS === 'ios' ? 'Connect Apple Health and devices that share data with it' : 'Connect Health Connect and compatible fitness devices'}</Text></View></View>
          <Text style={[styles.connectedDeviceHint, { color: themeMuted }]}>{Platform.OS === 'ios' ? 'Wearables and apps that write workouts and activity to Apple Health can sync here, including compatible Garmin, Fitbit, Oura, and other apps.' : 'Connect compatible apps and devices through Health Connect, including supported Fitbit, Samsung Health, Garmin, and other sources.'}</Text>
          {healthProvider ? <View style={styles.healthSettingsActions}><Pressable onPress={connectHealthProvider} disabled={syncingHealth} style={styles.healthSettingsButton}><Text style={styles.healthSettingsButtonText}>{syncingHealth ? 'Syncing…' : 'Sync now'}</Text></Pressable><Pressable onPress={disconnectHealthProvider} disabled={syncingHealth} style={styles.disconnectSettingsButton}><Text style={styles.disconnectText}>Disconnect</Text></Pressable></View> : <Pressable onPress={connectHealthProvider} disabled={syncingHealth || Platform.OS === 'web'} style={[styles.healthSettingsButton, (syncingHealth || Platform.OS === 'web') && styles.disabledAction]}><Text style={styles.healthSettingsButtonText}>{Platform.OS === 'web' ? 'Connect on mobile' : syncingHealth ? 'Connecting…' : `Connect ${Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}`}</Text></Pressable>}
          <Pressable style={[styles.settingsRow, settingsSurface]} onPress={() => { onClose(); setTab('activity') }}><AppIcon name="navigate-circle-outline" color="#FF7900" /><View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Activity tracking</Text><Text style={[styles.simpleRowSub, { color: themeMuted }]}>Routes and activity history</Text></View><AppIcon name="chevron-forward" color={themeMuted} /></Pressable>
          <Text style={styles.settingsSectionLabel}>CLUBS</Text>
          <Pressable style={[styles.settingsRow, settingsSurface]} onPress={() => { onClose(); setTab('owner') }}><AppIcon name="people-circle-outline" color="#FF7900" /><View style={styles.settingsRowCopy}><Text style={[styles.simpleRowTitle, { color: themeText }]}>Club owner access</Text><Text style={[styles.simpleRowSub, { color: themeMuted }]}>{ownerStatus === 'verified' ? 'Manage your club pages' : 'Request or check owner access'}</Text></View><AppIcon name="chevron-forward" color={themeMuted} /></Pressable>
          <Text style={[styles.settingsPrivacy, { color: themeMuted }]}>FitHive uses your location only for activity tracking and fitness data only when you connect a health app. You can manage those permissions in your device settings.</Text>
          <Pressable style={styles.settingsSignOut} onPress={signOut}><AppIcon name="log-out-outline" color="#a32020" /><Text style={styles.signOutLabel}>Sign out</Text></Pressable>
        </ScrollView>
        {renderBottomTabs((next) => { onClose(); setTab(next) })}
      </SafeAreaView>
    </Modal>
  )
}
