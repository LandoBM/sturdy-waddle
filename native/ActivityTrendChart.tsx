import Svg, { Circle, Line, Polyline } from 'react-native-svg'
import { Text, View } from 'react-native'
import { theme } from '../src/theme'

export type ActivityTrendPoint = { label: string; minutes: number }

export function ActivityTrendChart({ data, dark }: { data: ActivityTrendPoint[]; dark: boolean }) {
  const foreground = dark ? theme.colors.darkText : theme.colors.ink
  const muted = dark ? theme.colors.darkMuted : theme.colors.muted
  const grid = dark ? theme.colors.darkBorder : theme.colors.line
  const surface = dark ? theme.colors.darkSurface : '#FFFFFF'
  const width = 320
  const height = 150
  const chartTop = 16
  const chartBottom = 114
  const chartLeft = 12
  const chartRight = width - 12
  const max = Math.max(30, ...data.map((point) => point.minutes))
  const points = data.map((point, index) => {
    const x = chartLeft + (index / Math.max(1, data.length - 1)) * (chartRight - chartLeft)
    const y = chartBottom - (point.minutes / max) * (chartBottom - chartTop)
    return { ...point, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <View style={{ backgroundColor: surface, borderColor: grid, borderWidth: 1, borderRadius: 24, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View><Text style={{ color: foreground, fontSize: 16, fontWeight: '800' }}>Activity progress</Text><Text style={{ color: muted, fontSize: 10, marginTop: 3 }}>Recorded movement · last 7 days</Text></View>
        {data.length > 0 && <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: '800' }}>{data.reduce((total, point) => total + point.minutes, 0)} min</Text>}
      </View>
      {data.length === 0 ? <View style={{ minHeight: 108, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: muted, fontSize: 11, textAlign: 'center' }}>Complete an activity to see your weekly progress here.</Text></View> : <View><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2].map((step) => { const y = chartTop + step * ((chartBottom - chartTop) / 2); return <Line key={step} x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke={grid} strokeWidth={1} /> })}
        <Polyline points={polyline} fill="none" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <Circle key={point.label} cx={point.x} cy={point.y} r={4} fill={theme.colors.accent} stroke={surface} strokeWidth={2} />)}
      </Svg><View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 3 }}><Text style={{ color: muted, fontSize: 9 }}>{data[0].label}</Text><Text style={{ color: muted, fontSize: 9 }}>{data[Math.floor(data.length / 2)].label}</Text><Text style={{ color: muted, fontSize: 9 }}>{data[data.length - 1].label}</Text></View></View>}
    </View>
  )
}
