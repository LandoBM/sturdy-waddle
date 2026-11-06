import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Polyline } from 'react-native-svg'
import type { ActivityPoint } from './activity'

export function RouteMap({ points }: { points: ActivityPoint[] }) {
  if (points.length < 2) {
    return <View style={styles.empty}><Text style={styles.text}>A route map will appear after GPS points are recorded on a mobile device.</Text></View>
  }
  const minLatitude = Math.min(...points.map((point) => point.latitude))
  const maxLatitude = Math.max(...points.map((point) => point.latitude))
  const minLongitude = Math.min(...points.map((point) => point.longitude))
  const maxLongitude = Math.max(...points.map((point) => point.longitude))
  const latitudeRange = maxLatitude - minLatitude || 0.00001
  const longitudeRange = maxLongitude - minLongitude || 0.00001
  const coordinates = points.map((point) => {
    const x = 12 + ((point.longitude - minLongitude) / longitudeRange) * 176
    const y = 12 + (1 - (point.latitude - minLatitude) / latitudeRange) * 96
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const start = coordinates.split(' ')[0].split(',')
  const end = coordinates.split(' ').at(-1)!.split(',')

  return (
    <View style={styles.map}>
      <Svg width="100%" height={140} viewBox="0 0 200 120">
        <Polyline points={coordinates} fill="none" stroke="#d9ff5a" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={Number(start[0])} cy={Number(start[1])} r={5} fill="#151712" />
        <Circle cx={Number(end[0])} cy={Number(end[1])} r={5} fill="#e9516c" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  map: { height: 140, width: '100%', borderRadius: 13, overflow: 'hidden', backgroundColor: '#eef0e8' },
  empty: { height: 120, alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: '#f4f5ef', borderRadius: 13 },
  text: { color: '#73776d', fontSize: 11, lineHeight: 16, textAlign: 'center' },
})
