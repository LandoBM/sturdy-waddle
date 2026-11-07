import MapView, { Marker, Polyline } from 'react-native-maps'
import { StyleSheet, Text, View } from 'react-native'
import type { ActivityPoint } from './activity'
import { useColorScheme } from 'nativewind'

export function RouteMap({ points, darkMode }: { points: ActivityPoint[]; darkMode?: boolean }) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const latest = points[points.length - 1]

  if (!latest) {
    return (
      <View style={[styles.notice, { backgroundColor: dark ? '#171C19' : '#F5F6F2' }]}>
        <Text style={[styles.noticeTitle, { color: dark ? '#F8FAF7' : '#171C19' }]}>Waiting for GPS</Text>
        <Text style={[styles.noticeText, { color: dark ? '#A9B3A9' : '#68736B' }]}>The map will center on your first recorded location.</Text>
      </View>
    )
  }
  const region = { latitude: latest.latitude, longitude: latest.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }

  return (
    <MapView style={styles.map} region={region} mapType="standard">
      {points.length > 1 && <Polyline coordinates={points} strokeColor="#FF7900" strokeWidth={5} />}
      {!!points.length && <Marker coordinate={points[0]} title="Start" pinColor="#FF7900" />}
      {!!latest && points.length > 1 && <Marker coordinate={latest} title="Current location" pinColor="#FFB067" />}
    </MapView>
  )
}

const styles = StyleSheet.create({
  map: { height: 210, width: '100%', borderRadius: 13, overflow: 'hidden' },
  notice: { minHeight: 120, justifyContent: 'center', padding: 14, borderRadius: 13, backgroundColor: '#f4f5ef' },
  noticeTitle: { color: '#151712', fontWeight: '800', fontSize: 12 },
  noticeText: { color: '#73776d', fontSize: 10, lineHeight: 15, marginTop: 5 },
})
