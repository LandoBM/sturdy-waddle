const METERS_PER_MILE = 1609.344
export const COMPLETION_POINTS = 25

export function calculateDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const earthRadiusMeters = 6_371_000
  const latitudeDelta = radians(b.latitude - a.latitude)
  const longitudeDelta = radians(b.longitude - a.longitude)
  const term = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term))
}

export function formatActivityDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function formatActivityDistance(meters: number) {
  return (meters / METERS_PER_MILE).toFixed(2)
}

export function calculatePaceSecondsPerMile(distanceMeters: number, elapsedSeconds: number) {
  const miles = distanceMeters / METERS_PER_MILE
  return miles > 0 ? Math.round(elapsedSeconds / miles) : 0
}

export function formatPace(secondsPerMile: number) {
  if (!secondsPerMile) return '--:--'
  return `${Math.floor(secondsPerMile / 60)}:${String(secondsPerMile % 60).padStart(2, '0')}`
}
