import * as ImagePicker from 'expo-image-picker'
import { Asset, requestPermissionsAsync } from 'expo-media-library'
import { File } from 'expo-file-system'
import { useRef, useState } from 'react'
import { Alert, Animated, Image, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { type RecordedActivity } from './activity'
import { calculatePaceSecondsPerMile, formatActivityDistance, formatActivityDuration, formatPace } from './activityMetrics'
import { resolveActivityRoute } from './demoActivityRoutes'
import { ActivityRoutePreview } from './ActivityRoutePreview'
import { theme } from '../src/theme'

type StoryTemplate = 'route' | 'stats' | 'photo'
type TextPosition = 'top' | 'center' | 'bottom'
type FontStyle = 'bold' | 'clean' | 'mono'

function routeSegments(points: RecordedActivity['points']) {
  const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
  const segments: RecordedActivity['points'][] = [[]]
  validPoints.forEach((point, index) => {
    const previous = validPoints[index - 1]
    if (previous && point.timestamp - previous.timestamp > 90_000) segments.push([])
    segments[segments.length - 1].push(point)
  })
  return segments.filter((segment) => segment.length > 1 && segment.some((point, index) => index > 0 && point.latitude !== segment[index - 1].latitude || index > 0 && point.longitude !== segment[index - 1].longitude))
}

function elevationGain(points: RecordedActivity['points']) {
  return points.reduce((gain, point, index) => {
    const previous = points[index - 1]?.altitude
    return previous !== null && previous !== undefined && point.altitude !== null && point.altitude !== undefined
      ? gain + Math.max(0, point.altitude - previous)
      : gain
  }, 0)
}

function StoryMetric({ label, value }: { label: string; value: string }) {
  return <View style={styles.storyMetric}><Text style={styles.storyMetricValue}>{value}</Text><Text style={styles.storyMetricLabel}>{label}</Text></View>
}

export function ActivityStoryEditor({ activity, dark, onClose, onPostToFeed }: { activity: RecordedActivity; dark: boolean; onClose: () => void; onPostToFeed?: (imageUri: string, caption: string) => void | Promise<void> }) {
  const { width, height: screenHeight } = useWindowDimensions()
  const captureTarget = useRef<any>(null)
  const dismissY = useRef(new Animated.Value(0)).current
  const resolvedRoute = resolveActivityRoute(activity)
  const displayRoutePoints = resolvedRoute.points
  const segments = routeSegments(displayRoutePoints)
  const hasValidRoute = segments.length > 0
  const isDemoRoute = resolvedRoute.source === 'demo'
  const [template, setTemplate] = useState<StoryTemplate>(hasValidRoute ? 'route' : 'stats')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [fontStyle, setFontStyle] = useState<FontStyle>('bold')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textPosition, setTextPosition] = useState<TextPosition>('bottom')
  const [transparentExport, setTransparentExport] = useState(false)
  const [posting, setPosting] = useState(false)
  const cardWidth = Math.min(width - 48, 360)
  const cardHeight = Math.round(cardWidth * 16 / 9)
  const routeWidth = cardWidth - 36
  const routeHeight = Math.round(cardHeight * 0.46)
  const pace = activity.distanceMeters > 0 && activity.elapsedSeconds > 0
    ? formatPace(calculatePaceSecondsPerMile(activity.distanceMeters, activity.elapsedSeconds))
    : null
  const gain = elevationGain(activity.points)
  const captionPosition = textPosition === 'top' ? styles.captionTop : textPosition === 'center' ? styles.captionCenter : styles.captionBottom
  const displayFont = fontStyle === 'clean' ? styles.storyFontClean : fontStyle === 'mono' ? styles.storyFontMono : styles.storyFontBold

  const dismissEditor = () => {
    Animated.timing(dismissY, { toValue: screenHeight, duration: 220, useNativeDriver: true }).start(onClose)
  }

  const headerPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) dismissY.setValue(gesture.dy)
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 120 || gesture.vy > 1.2) {
        dismissEditor()
      } else {
        Animated.spring(dismissY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(dismissY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
    },
  })).current

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri ?? null)
      setTemplate('photo')
    }
  }

  const captureStory = async () => {
    if (!captureTarget.current) throw new Error('The activity story is not ready yet.')
    const { captureRef } = require('react-native-view-shot') as { captureRef: (target: any, options: Record<string, unknown>) => Promise<string> }
    return captureRef(captureTarget.current, { format: 'png', quality: 1, pixelRatio: 3, fileName: `fithive-activity-${Date.now()}`, backgroundColor: transparentExport ? 'transparent' : undefined, result: 'tmpfile' })
  }

  const saveCapturedPng = async (uri: string) => {
    const file = new File(uri)
    if (!file.exists || file.extension.toLowerCase() !== '.png') {
      throw new Error('The PNG export could not be created. Please try again.')
    }
    const permission = await requestPermissionsAsync(true, ['photo'])
    if (!permission.granted) {
      throw new Error('Photo access is needed to save the PNG. Please allow FitHive to add photos and try again.')
    }
    await Asset.create(uri)
  }

  const saveStory = async () => {
    try {
      await saveCapturedPng(await captureStory())
      Alert.alert('Saved to Photos', 'Your FitHive activity story is ready to share.')
    } catch (error) {
      Alert.alert('Could not save story', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const downloadPng = async () => {
    if (template === 'photo') {
      await saveStory()
      return
    }
    try {
      setTransparentExport(true)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await saveCapturedPng(await captureStory())
      Alert.alert('PNG saved', 'Your transparent activity graphic is now in Photos.')
    } catch (error) {
      Alert.alert('Could not save PNG', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setTransparentExport(false)
    }
  }

  const openPostComposer = async () => {
    if (!onPostToFeed || posting) return
    setPosting(true)
    try {
      await onPostToFeed(await captureStory(), `${activity.kind} · ${formatActivityDuration(activity.elapsedSeconds)}`)
    } catch (error) {
      Alert.alert('Could not prepare post', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const shareStory = async () => {
    try {
      const uri = await captureStory()
      await Share.share({ title: `${activity.kind} on FitHive`, message: `${activity.kind} · ${formatActivityDuration(activity.elapsedSeconds)}`, url: uri })
    } catch (error) {
      Alert.alert('Could not share story', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  return (
    <Animated.View style={[styles.editor, { backgroundColor: dark ? '#090A0C' : '#F5F6F2', transform: [{ translateY: dismissY }] }]}> 
      <View {...headerPanResponder.panHandlers} style={styles.editorHeader}>
        <View style={styles.dragHandle} />
        <View style={styles.editorHeaderRow}><Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close activity story editor"><Text style={styles.closeText}>×</Text></Pressable><Text style={styles.editorTitle}>Share activity</Text><View style={styles.headerSpacer} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
        <View ref={captureTarget} collapsable={false} style={[styles.story, { width: cardWidth, height: cardHeight, backgroundColor: transparentExport ? 'transparent' : '#111419' }]}> 
          {template === 'photo' && photoUri ? <Image source={{ uri: photoUri }} style={styles.storyPhoto} resizeMode="cover" /> : null}
          <View pointerEvents="none" style={[styles.storyShade, template === 'photo' && photoUri ? styles.storyPhotoShade : null, transparentExport && styles.transparentStoryShade]} />
          {template === 'route' && hasValidRoute ? <View style={[styles.routeCanvas, { width: routeWidth, height: routeHeight }]}><ActivityRoutePreview points={displayRoutePoints} width={routeWidth} height={routeHeight} strokeWidth={6} /></View> : null}
          {template === 'route' && hasValidRoute ? <>
            <View style={styles.storyTop}><Text style={[styles.storySport, { color: textColor }, displayFont]}>{activity.kind.toUpperCase()}</Text>{isDemoRoute ? <Text style={styles.demoRouteLabel}>DEMO ROUTE · {resolvedRoute.label ?? 'PREVIEW'}</Text> : null}<View style={styles.storyMetricsRow}><StoryMetric label="TIME" value={formatActivityDuration(activity.elapsedSeconds)} />{activity.distanceMeters > 0 ? <StoryMetric label="DISTANCE" value={`${formatActivityDistance(activity.distanceMeters)} mi`} /> : null}{pace ? <StoryMetric label="PACE" value={pace} /> : null}{gain > 0 ? <StoryMetric label="ELEVATION" value={`${Math.round(gain)} m`} /> : null}</View></View>
            <View style={styles.storyBottom}><Text style={styles.storyBrand}>FitHive<Text style={styles.storyBrandAccent}>.</Text></Text><Text style={styles.storyDate}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
          </> : <>
          <View style={styles.storyNoRouteStats}>
            <Text style={[styles.storySport, { color: textColor }, displayFont]}>{activity.kind.toUpperCase()}</Text>
            {isDemoRoute ? <Text style={styles.demoRouteLabel}>DEMO ROUTE · {resolvedRoute.label ?? 'PREVIEW'}</Text> : null}
            <View style={styles.storyMetricsRow}><StoryMetric label="TIME" value={formatActivityDuration(activity.elapsedSeconds)} />{activity.distanceMeters > 0 ? <StoryMetric label="DISTANCE" value={`${formatActivityDistance(activity.distanceMeters)} mi`} /> : null}{pace ? <StoryMetric label="PACE" value={pace} /> : null}{gain > 0 ? <StoryMetric label="ELEVATION" value={`${Math.round(gain)} m`} /> : null}</View>
            {!hasValidRoute ? <Text style={styles.noRouteMessage}>No GPS route recorded</Text> : null}
          </View>
          <View style={styles.storyNoRouteBottom}>
            <Text style={styles.storyBrand}>FitHive<Text style={styles.storyBrandAccent}>.</Text></Text>
            <Text style={styles.storyDate}>{new Date(activity.endedAt ?? activity.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>
          </>}
          {caption ? <Text style={[styles.editableCaption, captionPosition, { color: textColor }, displayFont]}>{caption}</Text> : null}
        </View>

        <View style={styles.toolSection}><Text style={styles.toolLabel}>TEMPLATE</Text><View style={styles.toolRow}>{hasValidRoute ? <Pressable onPress={() => setTemplate('route')} style={[styles.toolButton, template === 'route' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Route + stats</Text></Pressable> : null}<Pressable onPress={() => setTemplate('stats')} style={[styles.toolButton, template === 'stats' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Stats only</Text></Pressable><Pressable onPress={photoUri ? () => setTemplate('photo') : choosePhoto} style={[styles.toolButton, template === 'photo' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>{photoUri ? 'Photo + stats' : 'Add photo'}</Text></Pressable></View></View>
        <View style={styles.toolSection}><Text style={styles.toolLabel}>TEXT</Text><View style={styles.toolRow}><Pressable onPress={() => setFontStyle('bold')} style={[styles.toolButton, fontStyle === 'bold' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Bold</Text></Pressable><Pressable onPress={() => setFontStyle('clean')} style={[styles.toolButton, fontStyle === 'clean' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Clean</Text></Pressable><Pressable onPress={() => setFontStyle('mono')} style={[styles.toolButton, fontStyle === 'mono' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Mono</Text></Pressable></View><View style={styles.toolRow}><Pressable onPress={() => setTextColor('#FFFFFF')} style={[styles.colorButton, { backgroundColor: '#FFFFFF' }, textColor === '#FFFFFF' && styles.colorButtonSelected]} accessibilityLabel="Use white story text" /><Pressable onPress={() => setTextColor('#FF7900')} style={[styles.colorButton, { backgroundColor: '#FF7900' }, textColor === '#FF7900' && styles.colorButtonSelected]} accessibilityLabel="Use orange story text" /><Pressable onPress={() => setTextColor('#A1A1AA')} style={[styles.colorButton, { backgroundColor: '#A1A1AA' }, textColor === '#A1A1AA' && styles.colorButtonSelected]} accessibilityLabel="Use gray story text" /><Pressable onPress={() => setTextPosition('top')} style={[styles.toolButton, textPosition === 'top' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Top</Text></Pressable><Pressable onPress={() => setTextPosition('center')} style={[styles.toolButton, textPosition === 'center' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Center</Text></Pressable><Pressable onPress={() => setTextPosition('bottom')} style={[styles.toolButton, textPosition === 'bottom' && styles.toolButtonSelected]}><Text style={styles.toolButtonText}>Bottom</Text></Pressable></View></View>
        <TextInput value={caption} onChangeText={setCaption} placeholder="Add a caption" placeholderTextColor="#71717A" style={styles.captionInput} maxLength={100} />
        <View style={styles.actionRow}><Pressable onPress={() => { void downloadPng() }} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{template === 'photo' ? 'Download PNG' : 'Download transparent PNG'}</Text></Pressable><Pressable onPress={() => { void shareStory() }} style={styles.primaryAction}><Text style={styles.primaryActionText}>Share story</Text></Pressable></View>
        {onPostToFeed ? <Pressable onPress={() => { void openPostComposer() }} disabled={posting} style={[styles.feedAction, posting && styles.disabledAction]}><Text style={styles.primaryActionText}>{posting ? 'Preparing post…' : 'Post to Feed'}</Text></Pressable> : null}
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  editor: { flex: 1 },
  editorHeader: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  editorHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dragHandle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: '#52525B', marginBottom: 10 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#24262B' },
  closeText: { color: '#FFFFFF', fontSize: 29, lineHeight: 32, fontWeight: '300' },
  editorTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '900' },
  headerSpacer: { width: 42 },
  editorContent: { alignItems: 'center', paddingHorizontal: 18, paddingBottom: 38 },
  story: { overflow: 'hidden', borderRadius: 22, position: 'relative', marginBottom: 18 },
  storyPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  storyShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(9,10,12,0.2)' },
  storyPhotoShade: { backgroundColor: 'rgba(9,10,12,0.42)' },
  transparentStoryShade: { backgroundColor: 'transparent' },
  routeCanvas: { position: 'absolute', top: '29%', left: 18 },
  storyTop: { position: 'absolute', top: 28, left: 22, right: 22, alignItems: 'center' },
  storyBottom: { position: 'absolute', bottom: 24, left: 22, right: 22, alignItems: 'center' },
  storyNoRouteStats: { position: 'absolute', left: 22, right: 22, top: '34%', alignItems: 'center' },
  storyNoRouteBottom: { position: 'absolute', left: 22, right: 22, bottom: 24, alignItems: 'center' },
  editableCaption: { position: 'absolute', left: 22, right: 22, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  captionTop: { top: '22%' },
  captionCenter: { top: '52%' },
  captionBottom: { bottom: '15%' },
  storyBrand: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.8 },
  storyBrandAccent: { color: '#FF7900' },
  storySport: { fontSize: 11, letterSpacing: 1.3, marginTop: 18, textAlign: 'center' },
  demoRouteLabel: { color: '#FFB067', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 7, textAlign: 'center' },
  storyFontBold: { fontWeight: '900' },
  storyFontClean: { fontWeight: '500' },
  storyFontMono: { fontFamily: 'monospace', fontWeight: '700' },
  storyMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 8 },
  storyMetric: { minWidth: 65 },
  storyMetricValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  storyMetricLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  storyDate: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 15 },
  noRouteMessage: { color: 'rgba(255,255,255,0.62)', fontSize: 10, marginTop: 18 },
  toolSection: { width: '100%', marginBottom: 14 },
  toolLabel: { color: '#A1A1AA', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  toolButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#303238', backgroundColor: '#17191D' },
  toolButtonSelected: { borderColor: '#FF7900', backgroundColor: '#3A2117' },
  toolButtonText: { color: '#F5F5F5', fontSize: 10, fontWeight: '800' },
  colorButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#303238' },
  colorButtonSelected: { borderColor: '#FF7900', borderWidth: 3 },
  captionInput: { width: '100%', minHeight: 48, borderWidth: 1, borderColor: '#303238', borderRadius: 16, paddingHorizontal: 14, color: '#F5F5F5', backgroundColor: '#17191D', marginTop: 2, marginBottom: 14 },
  actionRow: { width: '100%', flexDirection: 'row', gap: 9 },
  secondaryAction: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 1, borderColor: '#303238', backgroundColor: '#17191D' },
  secondaryActionText: { color: '#F5F5F5', fontSize: 12, fontWeight: '900' },
  primaryAction: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: theme.colors.accent },
  feedAction: { width: '100%', minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#24262B', marginTop: 10 },
  disabledAction: { opacity: 0.55 },
  primaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
})
