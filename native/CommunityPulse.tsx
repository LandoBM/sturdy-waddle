import Svg, { Circle, Line, Polyline } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'

export function CommunityPulse({ media, darkMode, foreground, muted, surface }: { media: Array<any>; darkMode: boolean; foreground: string; muted: string; surface: string }) {
  const values = media.slice(0, 7).map((item) => Number(item.likes) || 0)
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${10 + (index / Math.max(values.length - 1, 1)) * 300},${88 - (value / max) * 66}`).join(' ')
  return <View style={styles.card} accessibilityLabel="Community-wide engagement pulse">
    <View style={styles.header}><View><Text style={[styles.title, { color: foreground }]}>Community pulse</Text><Text style={[styles.subtitle, { color: muted }]}>Community-wide engagement, not personal activity</Text></View><View style={styles.icon}><Text style={styles.iconText}>↗</Text></View></View>
    <View style={styles.chart}><Svg width="100%" height={112} viewBox="0 0 320 112">{[22, 55, 88].map((y) => <Line key={y} x1="10" x2="310" y1={y} y2={y} stroke={darkMode ? '#3A3D42' : '#E7EAE4'} strokeWidth="1" />)}<Polyline points={points} fill="none" stroke="#FF7900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <Circle key={`${value}-${index}`} cx={10 + (index / Math.max(values.length - 1, 1)) * 300} cy={88 - (value / max) * 66} r="4" fill="#FF7900" stroke={surface} strokeWidth="2" />)}</Svg><View style={styles.labels}><Text style={[styles.caption, { color: muted }]}>Recent</Text><Text style={[styles.total, { color: foreground }]}>{Math.round(values.reduce((sum, value) => sum + value, 0))} likes</Text><Text style={[styles.caption, { color: muted }]}>Now</Text></View></View>
  </View>
}

const styles = StyleSheet.create({
  card: { borderRadius: 23, borderWidth: 1, padding: 16, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.35 },
  subtitle: { fontSize: 11, marginTop: 3 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7900' },
  iconText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  chart: { marginTop: 13 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  caption: { fontSize: 9 },
  total: { fontSize: 10, fontWeight: '800' },
})
