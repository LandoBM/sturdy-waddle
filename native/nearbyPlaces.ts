import { distanceBetweenCoordinates, type Coordinates } from '../src/data'

export interface NearbyPlace {
  id: string
  name: string
  kind: string
  activities: string[]
  coordinates: Coordinates
  miles: number
}

export interface PostalLocation extends Coordinates {
  city: string
  region: string
  country: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parsePostalLocation(value: unknown): PostalLocation | null {
  if (!isRecord(value) || !Array.isArray(value.places)) return null
  const place = value.places.find(isRecord)
  if (!place) return null
  const city = place['place name']
  const region = place['state abbreviation'] ?? place.state ?? ''
  const country = place['country abbreviation']
  const latitude = Number(place.latitude)
  const longitude = Number(place.longitude)
  if (
    typeof city !== 'string'
    || typeof region !== 'string'
    || typeof country !== 'string'
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90
    || Math.abs(longitude) > 180
  ) return null
  return { city, region, country, latitude, longitude }
}

function activityIdeas(tags: Record<string, unknown>) {
  const leisure = String(tags.leisure ?? '')
  const sport = String(tags.sport ?? '').toLowerCase()
  if (leisure === 'park' || leisure === 'garden' || leisure === 'recreation_ground') {
    return ['Outdoor yoga', 'Walking', 'Trail running', 'Tai chi']
  }
  if (leisure === 'fitness_centre' || leisure === 'sports_centre') {
    return ['Pilates', 'Kickboxing', 'Strength training', 'Dance fitness']
  }
  if (leisure === 'pitch' || sport) {
    const sportIdeas: Record<string, string[]> = {
      basketball: ['Basketball', 'Streetball drills'],
      soccer: ['Soccer', 'Futsal drills'],
      tennis: ['Tennis', 'Cardio tennis'],
      swimming: ['Swimming', 'Water aerobics'],
      volleyball: ['Volleyball', 'Beach volleyball'],
      yoga: ['Outdoor yoga', 'Mobility flow'],
      running: ['Running', 'Track intervals'],
      cycling: ['Cycling', 'Group ride'],
      climbing: ['Climbing', 'Bouldering'],
    }
    return sportIdeas[sport] ?? ['Group sports', 'Fitness circuit', 'Outdoor yoga']
  }
  if (tags.tourism === 'camp_site') return ['Camping', 'Hiking', 'Morning yoga']
  if (tags.natural === 'beach') return ['Swimming', 'Beach volleyball', 'Outdoor yoga', 'Walking']
  if (tags.natural === 'peak') return ['Hiking', 'Trail running', 'Orienteering']
  if (tags.highway === 'path' || tags.highway === 'footway' || tags.highway === 'cycleway') {
    return ['Walking', 'Trail running', 'Cycling']
  }
  return ['Walking', 'Outdoor yoga', 'Fitness circuit']
}

export const activityIdeasForAnyLocation = [
  'Outdoor yoga',
  'Pilates',
  'Kickboxing',
  'Walking',
  'Trail running',
  'Calisthenics',
  'Tai chi',
  'Cycling',
]

export function activityIdeasForCountry(country: string) {
  if (country.toUpperCase() === 'US') {
    return ['Walking or jogging on public paths', 'Outdoor bodyweight workout']
  }
  return activityIdeasForAnyLocation
}

function placeKind(tags: Record<string, unknown>) {
  if (typeof tags.leisure === 'string') return tags.leisure.replace(/_/g, ' ')
  if (typeof tags.sport === 'string') return tags.sport.replace(/_/g, ' ')
  if (typeof tags.tourism === 'string') return tags.tourism.replace(/_/g, ' ')
  if (typeof tags.natural === 'string') return tags.natural.replace(/_/g, ' ')
  return typeof tags.highway === 'string' ? tags.highway.replace(/_/g, ' ') : 'activity spot'
}

export function parseNearbyPlaces(value: unknown, origin: Coordinates): NearbyPlace[] {
  if (!isRecord(value) || !Array.isArray(value.elements)) return []
  const places = new Map<string, NearbyPlace>()
  for (const element of value.elements) {
    if (!isRecord(element) || !isRecord(element.tags)) continue
    const tags = element.tags
    const name = typeof tags.name === 'string' ? tags.name.trim() : ''
    const coordinates = isRecord(element.center) ? element.center : element
    const latitude = Number(coordinates.lat)
    const longitude = Number(coordinates.lon)
    if (
      !name
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90
      || Math.abs(longitude) > 180
    ) continue
    const point = { latitude, longitude }
    const id = String(element.id ?? `${name}:${latitude}:${longitude}`)
    places.set(id, {
      id,
      name,
      kind: placeKind(tags),
      activities: activityIdeas(tags),
      coordinates: point,
      miles: distanceBetweenCoordinates(origin, point),
    })
  }
  return [...places.values()].sort((a, b) => a.miles - b.miles).slice(0, 30)
}

export function nearbyPlacesQuery({ latitude, longitude }: Coordinates) {
  const around = `around:15000,${latitude},${longitude}`
  return `[out:json][timeout:20];(nwr(${around})["leisure"~"park|garden|recreation_ground|pitch|sports_centre|fitness_centre|track"];nwr(${around})["sport"];nwr(${around})["tourism"="camp_site"];nwr(${around})["natural"~"beach|peak"];nwr(${around})["highway"~"path|footway|cycleway"];);out center tags 100;`
}

export async function fetchNearbyPlaces(origin: Coordinates): Promise<NearbyPlace[]> {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: nearbyPlacesQuery(origin) }).toString(),
  })
  if (!response.ok) throw new Error(`Nearby place search returned HTTP ${response.status}.`)
  return parseNearbyPlaces(await response.json(), origin)
}
