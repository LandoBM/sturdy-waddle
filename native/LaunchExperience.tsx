import { VideoView, useVideoPlayer } from 'expo-video'
import { useEventListener } from 'expo'
import { scheduleOnRN } from 'react-native-worklets'
import { useCallback, useEffect, useRef, type ComponentProps } from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

type LaunchExperienceProps = {
  ready: boolean
  onReady: () => void
  onFinished: () => void
}

// A locally bundled skier MP4 can be assigned here when the production asset is available.
// Keeping this explicit prevents a missing media file from breaking cold start.
export const skierLaunchVideoSource: number | null = null

const flakes = [
  { left: 0.12, top: 0.19, size: 3, delay: 0 },
  { left: 0.24, top: 0.34, size: 2, delay: 180 },
  { left: 0.42, top: 0.17, size: 3, delay: 320 },
  { left: 0.62, top: 0.28, size: 2, delay: 120 },
  { left: 0.78, top: 0.16, size: 3, delay: 260 },
  { left: 0.9, top: 0.39, size: 2, delay: 420 },
  { left: 0.18, top: 0.66, size: 2, delay: 390 },
  { left: 0.84, top: 0.7, size: 3, delay: 540 },
]

export function LaunchExperience({ ready, onReady, onFinished }: LaunchExperienceProps) {
  const { width, height } = useWindowDimensions()
  const progress = useSharedValue(0)
  const finished = useSharedValue(0)
  const onReadyRef = useRef(onReady)
  const onFinishedRef = useRef(onFinished)
  const mountedRef = useRef(true)
  const completionScheduledRef = useRef(false)
  onReadyRef.current = onReady
  onFinishedRef.current = onFinished
  const finishOnRN = useCallback(() => {
    if (!mountedRef.current || completionScheduledRef.current) return
    completionScheduledRef.current = true
    onFinishedRef.current()
  }, [])
  const videoPlayer = useVideoPlayer(skierLaunchVideoSource, (player) => {
    player.muted = true
    player.loop = false
  })
  const videoViewPlayer = videoPlayer as unknown as ComponentProps<typeof VideoView>['player']

  useEventListener(videoPlayer, 'statusChange', ({ status, error }) => {
    if (__DEV__) console.log('[Launch] video status', { status, error: error?.message ?? null })
  })
  useEventListener(videoPlayer, 'playingChange', ({ isPlaying }) => {
    if (__DEV__) console.log('[Launch] video playback', { isPlaying })
  })
  useEventListener(videoPlayer, 'playToEnd', () => {
    if (__DEV__) console.log('[Launch] video playback finished')
  })

  useEffect(() => {
    if (__DEV__) console.log('[Launch] LaunchExperience mounted')
    onReadyRef.current()
    if (skierLaunchVideoSource === null) {
      if (__DEV__) console.warn('[Launch] skier video asset is missing; using FitHive logo fallback')
    } else {
      if (__DEV__) console.log('[Launch] video source resolved')
      try {
        videoPlayer.play()
        if (__DEV__) console.log('[Launch] video playback started')
      } catch (error) {
        if (__DEV__) console.error('[Launch] video playback failed', error)
      }
    }
    if (__DEV__) console.log('[Launch] logo animation started')
    progress.value = withSequence(
      withTiming(0.44, { duration: 700, easing: Easing.out(Easing.cubic) }),
      withTiming(0.74, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
    )
  }, [onReadyRef, progress, videoPlayer])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    const timeout = setTimeout(() => {
      finished.value = withTiming(1, { duration: 520 }, (complete) => {
        if (complete) scheduleOnRN(finishOnRN)
      })
    }, 3200)
    return () => clearTimeout(timeout)
  }, [finished, finishOnRN, ready])

  useEffect(() => {
    if (!ready) return
    const timeout = setTimeout(() => {
      if (__DEV__) console.log('[Launch] logo animation finished')
    }, 2500)
    return () => clearTimeout(timeout)
  }, [ready])

  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7, 1], [0.18, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height * 0.2, -height * 0.18], Extrapolation.CLAMP) }, { scaleX: interpolate(progress.value, [0, 0.65, 1], [0.7, 1.15, 1.7], Extrapolation.CLAMP) }],
  }))
  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 0.7, 1], [0, 0.65, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0.35, 0.75, 1], [0.86, 1.04, 1], Extrapolation.CLAMP) }],
  }))
  const contentStyle = useAnimatedStyle(() => ({ opacity: interpolate(finished.value, [0, 1], [1, 0], Extrapolation.CLAMP) }))

  return (
    <Animated.View style={[styles.container, contentStyle]} accessibilityLabel="FitHive starting">
      {skierLaunchVideoSource !== null && <VideoView player={videoViewPlayer} style={styles.video} contentFit="cover" nativeControls={false} />}
      <Animated.View style={[styles.snowVeil, { width: width * 1.5, height: Math.max(180, height * 0.34) }, veilStyle]} />
      {flakes.map((flake) => (
        <Animated.View
          key={`${flake.left}-${flake.top}`}
          style={[styles.flake, { left: width * flake.left, top: height * flake.top, width: flake.size, height: flake.size }, { opacity: 0.45 }]}
        />
      ))}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image source={require('../assets/fithive-wordmark-transparent.png')} resizeMode="contain" style={{ width: Math.min(width * 0.7, 290), height: 88 }} accessibilityLabel="FitHive" />
      </Animated.View>
      <View style={styles.orangeLine} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, backgroundColor: '#090A0C', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  video: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.82 },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  snowVeil: { position: 'absolute', left: '-25%', top: '38%', borderRadius: 999, backgroundColor: '#F5F5F5', shadowColor: '#FFFFFF', shadowOpacity: 0.3, shadowRadius: 32, shadowOffset: { width: 0, height: 0 } },
  flake: { position: 'absolute', borderRadius: 99, backgroundColor: '#F5F5F5' },
  orangeLine: { position: 'absolute', bottom: '27%', width: 44, height: 4, borderRadius: 99, backgroundColor: '#FF5A1F' },
})
