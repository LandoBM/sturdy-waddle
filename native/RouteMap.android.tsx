import { Camera, type CameraRef, GeoJSONSource, Layer, Map as MapLibreMap } from '@maplibre/maplibre-react-native'
import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ActivityPoint } from './activity'
import { useColorScheme } from 'nativewind'

const openStreetMapStyle = {
  version: 8 as const,
  sources: {
    openstreetmap: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'openstreetmap-tiles', type: 'raster' as const, source: 'openstreetmap' }],
}

export function RouteMap({ points, darkMode }: { points: ActivityPoint[]; darkMode?: boolean }) {
  const { colorScheme } = useColorScheme()
  const dark = darkMode ?? colorScheme === 'dark'
  const latest = points[points.length - 1]
  const camera = useRef<CameraRef>(null)

  useEffect(() => {
    if (!latest) return
    camera.current?.easeTo({
      center: [latest.longitude, latest.latitude],
      zoom: 15,
      duration: 450,
    })
  }, [latest?.latitude, latest?.longitude])

  if (!latest) {
    return (
      <View style={[styles.notice, { backgroundColor: dark ? '#171C19' : '#F5F6F2' }]}>
        <Text style={[styles.noticeTitle, { color: dark ? '#F8FAF7' : '#171C19' }]}>Waiting for GPS</Text>
        <Text style={[styles.noticeText, { color: dark ? '#A9B3A9' : '#68736B' }]}>The map will center on your first recorded location.</Text>
      </View>
    )
  }

  const route: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  }

  return (
    <View>
      <MapLibreMap style={styles.map} mapStyle={openStreetMapStyle}>
        <Camera ref={camera} initialViewState={{ center: [latest.longitude, latest.latitude], zoom: 15 }} />
        {points.length > 1 && (
          <GeoJSONSource id="activity-route" data={route}>
            <Layer
              id="activity-route-line"
              type="line"
              paint={{ 'line-color': '#FF7900', 'line-width': 5 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        )}
      </MapLibreMap>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  map: { height: 210, width: '100%', borderRadius: 13, overflow: 'hidden' },
  attribution: { color: '#73776d', fontSize: 9, textAlign: 'right', paddingTop: 4 },
  notice: { minHeight: 120, justifyContent: 'center', padding: 14, borderRadius: 13, backgroundColor: '#f4f5ef' },
  noticeTitle: { color: '#151712', fontWeight: '800', fontSize: 12 },
  noticeText: { color: '#73776d', fontSize: 10, lineHeight: 15, marginTop: 5 },
})
