import Svg, { Circle, G, Text as SvgText } from 'react-native-svg'
import { Text, View } from 'react-native'
import { useColorScheme } from 'nativewind'

export type FitnessRingValues = {
  move: number
  exercise: number
  stand: number
}

const ringDefinitions = [
  { key: 'move', label: 'Move', goal: 500, unit: 'kcal', color: '#FF7900', radius: 76 },
  { key: 'exercise', label: 'Exercise', goal: 30, unit: 'min', color: '#FFB067', radius: 57 },
  { key: 'stand', label: 'Stand', goal: 12, unit: 'hrs', color: '#75B9A2', radius: 38 },
] as const

export function FitnessRings({ values, compact = false, variant = 'default', darkMode }: { values: FitnessRingValues; compact?: boolean; variant?: 'default' | 'dashboard'; darkMode?: boolean }) {
  const size = variant === 'dashboard' ? 170 : compact ? 190 : 220
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const trackColor = dark ? '#2B332D' : '#E7EAE4'
  const foreground = dark ? '#F8FAF7' : '#171C19'
  const muted = dark ? '#A9B3A9' : '#68736B'

  return (
    <View className="items-center">
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {ringDefinitions.map((ring) => {
          const value = values[ring.key]
          const circumference = 2 * Math.PI * ring.radius
          const progress = Math.min(1, Math.max(0, value / ring.goal))
          return (
            <G key={ring.key}>
              <Circle cx={110} cy={110} r={ring.radius} fill="none" stroke={trackColor} strokeWidth={compact ? 11 : 13} />
              <Circle
                cx={110}
                cy={110}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={compact ? 11 : 13}
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${circumference * (1 - progress)}`}
                rotation={-90}
                origin="110, 110"
              />
            </G>
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
