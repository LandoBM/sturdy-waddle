import Svg, { Polyline } from 'react-native-svg'
import { View } from 'react-native'
import type { ActivityPoint } from './activity'
import { demoActivityRoutePoints } from './demoActivityRoutes'

type ActivityRoutePreviewProps = {
  routeId?: string | null
  points?: ActivityPoint[]
  width: number
  height: number
  strokeWidth?: number
  color?: string
}

export function ActivityRoutePreview({ routeId, points, width, height, strokeWidth = 4, color = '#FF5A1F' }: ActivityRoutePreviewProps) {
  const sourcePoints = points && points.length > 1 ? points : demoActivityRoutePoints(routeId)
  if (sourcePoints.length < 2) return <View style={{ width, height }} />

  const longitudes = sourcePoints.map((point) => point.longitude)
  const latitudes = sourcePoints.map((point) => point.latitude)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const longitudeSpan = Math.max(maxLongitude - minLongitude, 0.0001)
  const latitudeSpan = Math.max(maxLatitude - minLatitude, 0.0001)
  const padding = Math.max(strokeWidth * 2, 6)
  const scale = Math.min((width - padding * 2) / longitudeSpan, (height - padding * 2) / latitudeSpan)
  const offsetX = (width - longitudeSpan * scale) / 2
  const offsetY = (height - latitudeSpan * scale) / 2
  const polyline = sourcePoints
    .map((point) => `${offsetX + (point.longitude - minLongitude) * scale},${height - offsetY - (point.latitude - minLatitude) * scale}`)
    .join(' ')

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }} accessibilityLabel="Activity route preview">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={polyline} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}
