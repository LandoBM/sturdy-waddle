import Svg, { Circle, G, Text as SvgText } from 'react-native-svg'
import { Text, View } from 'react-native'

export type FitnessRingValues = {
  move: number
  exercise: number
  stand: number
}

const ringDefinitions = [
  { key: 'move', label: 'Move', goal: 500, unit: 'kcal', color: '#ff6c48', radius: 76 },
  { key: 'exercise', label: 'Exercise', goal: 30, unit: 'min', color: '#a447e8', radius: 57 },
  { key: 'stand', label: 'Stand', goal: 12, unit: 'hrs', color: '#22a9c5', radius: 38 },
] as const

export function FitnessRings({ values, compact = false }: { values: FitnessRingValues; compact?: boolean }) {
  const size = compact ? 190 : 220

  return (
    <View className="items-center">
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {ringDefinitions.map((ring) => {
          const value = values[ring.key]
          const circumference = 2 * Math.PI * ring.radius
          const progress = Math.min(1, Math.max(0, value / ring.goal))
          return (
            <G key={ring.key}>
              <Circle cx={110} cy={110} r={ring.radius} fill="none" stroke="#dfe8dd" strokeWidth={compact ? 11 : 13} />
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
        <SvgText x="110" y="106" textAnchor="middle" fill="#151712" fontSize={compact ? 18 : 21} fontWeight="800">{Math.round(values.exercise)}</SvgText>
        <SvgText x="110" y="124" textAnchor="middle" fill="#73776d" fontSize="10">exercise min</SvgText>
      </Svg>
      <View className="mt-1 w-full flex-row justify-around">
        {ringDefinitions.map((ring) => (
          <View key={ring.key} className="items-center px-1">
            <View className="mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: ring.color }} />
            <Text className="text-[10px] font-extrabold text-ink dark:text-[#f3f7f0]">{Math.round(values[ring.key])} {ring.unit}</Text>
            <Text className="mt-0.5 text-[9px] text-slate-500 dark:text-[#9eafa2]">{ring.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
