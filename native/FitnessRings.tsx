import Svg, { Circle, G, Text as SvgText } from 'react-native-svg'
import { Animated, Text, View } from 'react-native'
import { useEffect, useRef } from 'react'
import { useColorScheme } from 'nativewind'
import { theme } from '../src/theme'

export type FitnessRingValues = {
  move: number
  exercise: number
  stand: number
}

const ringDefinitions = [
  { key: 'move', label: 'Move', goal: 500, unit: 'kcal', color: theme.colors.accent, radius: 76 },
  { key: 'exercise', label: 'Exercise', goal: 30, unit: 'min', color: theme.colors.accentSoft, radius: 57 },
  { key: 'stand', label: 'Stand', goal: 12, unit: 'hrs', color: '#75B9A2', radius: 38 },
] as const

function RingArc({ radius, circumference, progress, color, trackColor, strokeWidth }: { radius: number; circumference: number; progress: number; color: string; trackColor: string; strokeWidth: number }) {
  const animatedProgress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(animatedProgress, { toValue: progress, duration: 500, useNativeDriver: false }).start()
  }, [animatedProgress, progress])
  const dashOffset = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })
  const AnimatedCircle = Animated.createAnimatedComponent(Circle)
  return <G><Circle cx={110} cy={110} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} /><AnimatedCircle cx={110} cy={110} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={dashOffset} rotation={-90} origin="110, 110" /></G>
}

export function FitnessRings({ values, compact = false, variant = 'default', darkMode }: { values: FitnessRingValues; compact?: boolean; variant?: 'default' | 'dashboard'; darkMode?: boolean }) {
  const size = variant === 'dashboard' ? 148 : compact ? 180 : 220
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const trackColor = dark ? theme.colors.darkBorder : theme.colors.line
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const muted = dark ? theme.colors.darkMuted : theme.colors.muted

  return (
    <View className="items-center">
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {ringDefinitions.map((ring) => {
          const value = values[ring.key]
          const circumference = 2 * Math.PI * ring.radius
          const progress = Math.min(1, Math.max(0, value / ring.goal))
          return (
            <RingArc key={ring.key} radius={ring.radius} circumference={circumference} progress={progress} color={ring.color} trackColor={trackColor} strokeWidth={compact ? 11 : 13} />
          )
        })}
        <SvgText x="110" y="106" textAnchor="middle" fill={foreground} fontSize={compact ? 18 : 21} fontWeight="800">{Math.round(values.exercise)}</SvgText>
        <SvgText x="110" y="124" textAnchor="middle" fill={muted} fontSize="10">exercise min</SvgText>
      </Svg>
      {variant !== 'dashboard' && <View className="mt-1 w-full flex-row justify-around">
        {ringDefinitions.map((ring) => (
          <View key={ring.key} className="items-center px-1">
            <View className="mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: ring.color }} />
            <Text style={{ color: foreground, fontSize: 10, fontWeight: '800' }}>{Math.round(values[ring.key])} {ring.unit}</Text>
            <Text style={{ color: muted, fontSize: 9, marginTop: 2 }}>{ring.label}</Text>
          </View>
        ))}
      </View>}
    </View>
  )
}
