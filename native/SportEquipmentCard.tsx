import { Image, Pressable, Text, View } from 'react-native'
import { sportAssetRegistry } from './activityCatalog'
import { theme } from '../src/theme'

export type SportEquipmentCardProps = {
  sport: string
  subtitle?: string
  darkMode?: boolean
  compact?: boolean
  onPress?: () => void
}

export function SportEquipmentCard({ sport, subtitle, darkMode = true, compact = false, onPress }: SportEquipmentCardProps) {
  const background = darkMode ? theme.colors.darkElevated : '#FFFFFF'
  const border = darkMode ? theme.colors.darkBorder : theme.colors.line
  const foreground = darkMode ? theme.colors.darkText : theme.colors.ink
  const muted = darkMode ? theme.colors.darkMuted : theme.colors.muted
  const image = sportAssetRegistry[sport as keyof typeof sportAssetRegistry]
  const content = (
    <View style={{ minHeight: compact ? 132 : 220, borderRadius: compact ? 18 : 24, overflow: 'hidden', backgroundColor: background, borderWidth: 1, borderColor: border }}>
      <View style={{ flex: 1, minHeight: compact ? 86 : 156, alignItems: 'center', justifyContent: 'center', backgroundColor: darkMode ? '#1D2024' : '#F4F5F2' }}>
        {image ? <Image source={image} resizeMode="contain" style={{ width: '92%', height: '92%' }} /> : <Text style={{ color: muted, fontSize: 11, fontWeight: '700' }}>Equipment coming soon</Text>}
      </View>
      <View style={{ paddingHorizontal: compact ? 11 : 15, paddingVertical: compact ? 9 : 12 }}>
        <Text style={{ color: foreground, fontSize: compact ? 12 : 16, fontWeight: '900' }} numberOfLines={1}>{sport}</Text>
        {!!subtitle && <Text style={{ color: muted, fontSize: 10, marginTop: 3 }} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
  )
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Explore ${sport}`}>{content}</Pressable> : content
}
