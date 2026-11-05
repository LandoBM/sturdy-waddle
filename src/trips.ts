import { areas, distanceFor, pic, type Club } from './data'

export const HOME = { city: 'Los Angeles', zip: '90027' }
export const FLIGHT_THRESHOLD_MILES = 100
export const PASSENGER = 'Alex Kim'

export interface Flight {
  direction: 'Going' | 'Return'
  airline: string
  flightNo: string
  confirmation: string
  date: string
  from: string
  fromCity: string
  to: string
  toCity: string
  depart: string
  arrive: string
  duration: string
  gate: string
  seat: string
  boarding: string
}

export interface GroundLeg {
  airport: string
  miles: number
  minutes: number
}

export interface Airport {
  code: string
  name: string
  city: string
}

export interface FlightOption {
  airline: string
  flightNo: string
  depart: string
  arrive: string
  duration: string
  stops: string
  price: number
  url: string
}

export interface Trip {
  id: string
  title: string
  club: string
  clubId: string
  category: string
  image: string
  dayIndex?: number
  dateLabel: string
  shortDay: string
  shortDate: string
  time: string
  startMin: number
  location: string
  locationNote: string
  miles: number
  objective: string
  slots: number
  capacity: number
  weather: string
  tone: 'lime' | 'blue' | 'pink'
  personal?: boolean
  flights?: Flight[]
  airport?: Airport
  options?: FlightOption[]
  groundAfter?: GroundLeg
}

export const trips: Trip[] = [
  { id: 't1', title: 'Tempo Night at the Reservoir', club: 'Griffith Run Crew', clubId: 'club-1', category: 'Running', image: pic.run, dayIndex: 0, dateLabel: 'Monday, October 17', shortDay: 'Mon', shortDate: '17', time: '6:00 PM – 7:30 PM', startMin: 18 * 60, location: 'Hollywood Reservoir, Los Angeles', locationNote: '5 mile loop · Easy to moderate', miles: 6, objective: 'Run a steady 5 mile tempo loop with pace groups for every level.', slots: 7, capacity: 20, weather: 'Sunny 78°F', tone: 'lime' },
  { id: 't2', title: 'Sunset Flow in the Park', club: 'Silver Lake Yogis', clubId: 'club-2', category: 'Wellness', image: pic.yoga, dayIndex: 2, dateLabel: 'Wednesday, October 19', shortDay: 'Wed', shortDate: '19', time: '5:30 PM – 6:45 PM', startMin: 17 * 60 + 30, location: 'Echo Park Lake, Los Angeles', locationNote: 'Bring a mat and water', miles: 4, objective: 'Slow flow yoga on the lawn as the sun goes down. All levels welcome.', slots: 9, capacity: 25, weather: 'Clear 74°F', tone: 'blue' },
  { id: 't3', title: 'Golden Hour Ridge Walk', club: 'Horizon Hikers', clubId: 'club-0', category: 'Hiking', image: pic.ridge, dayIndex: 3, dateLabel: 'Thursday, October 20', shortDay: 'Thu', shortDate: '20', time: '4:30 PM – 7:15 PM', startMin: 16 * 60 + 30, location: 'Griffith Park, West Trail', locationNote: '2.8 miles · Moderate', miles: 14, objective: 'Walk the ridge at golden hour and take in the best views of the city.', slots: 3, capacity: 20, weather: 'Cloudy 69°F', tone: 'lime' },
  { id: 't4', title: 'Sunrise at Eagle Rock', club: 'Horizon Hikers', clubId: 'club-0', category: 'Hiking', image: pic.hike, dayIndex: 5, dateLabel: 'Saturday, October 22', shortDay: 'Sat', shortDate: '22', time: '6:30 AM – 10:00 AM', startMin: 6 * 60 + 30, location: '1234 Eagle Rock Blvd, Los Angeles', locationNote: '4.2 miles · Moderate', miles: 12, objective: 'Catch the sunrise from the summit and finish with coffee together.', slots: 4, capacity: 8, weather: 'Sunny 66°F', tone: 'pink' },
  {
    id: 't5', title: 'Joshua Tree Bouldering Weekend', club: 'Horizon Hikers', clubId: 'club-0', category: 'Climbing', image: pic.climb2, dayIndex: 5, dateLabel: 'Saturday, October 22', shortDay: 'Sat', shortDate: '22', time: '10:00 AM – 5:00 PM', startMin: 10 * 60, location: 'Hidden Valley, Joshua Tree, CA', locationNote: 'Day climbing · All levels', miles: 138, objective: 'Boulder among the desert rocks with mentors for every grade. Crash pads provided.', slots: 5, capacity: 12, weather: 'Sunny 82°F', tone: 'lime',
    groundAfter: { airport: 'Palm Springs Airport', miles: 52, minutes: 62 },
    airport: { code: 'PSP', name: 'Palm Springs International', city: 'Palm Springs, CA' },
    options: [
      { airline: 'Alaska Airlines', flightNo: 'AS 2214', depart: '6:55 AM', arrive: '7:40 AM', duration: '0h 45m', stops: 'Nonstop', price: 128, url: 'https://www.alaskaair.com/' },
      { airline: 'United', flightNo: 'UA 5381', depart: '7:30 AM', arrive: '8:20 AM', duration: '0h 50m', stops: 'Nonstop', price: 142, url: 'https://www.united.com/en/us/fsr/choose-flights' },
      { airline: 'American Airlines', flightNo: 'AA 3040', depart: '8:15 AM', arrive: '9:03 AM', duration: '0h 48m', stops: 'Nonstop', price: 149, url: 'https://www.aa.com/booking/find-flights' },
      { airline: 'Delta', flightNo: 'DL 5127', depart: '9:40 AM', arrive: '10:31 AM', duration: '0h 51m', stops: 'Nonstop', price: 164, url: 'https://www.delta.com/flightsearch/book-a-flight' },
    ],
  },
  {
    id: 't6', title: 'Denali Backcountry Trek', club: 'Cascade Climbers', clubId: 'club-11', category: 'Hiking', image: pic.hike3, dateLabel: 'Friday, November 6', shortDay: 'Fri', shortDate: '06', time: '9:00 AM – 6:00 PM', startMin: 9 * 60, location: 'Denali National Park, Alaska', locationNote: '3 days · Challenging', miles: 2850, objective: 'A guided three day trek through the Alaska Range with camp stays and wildlife viewing.', slots: 1, capacity: 12, weather: 'Light snow 28°F', tone: 'blue',
    flights: [
      { direction: 'Going', airline: 'Delta', flightNo: 'DL 1457', confirmation: 'HJKK8L', date: '11/06/26', from: 'LAX', fromCity: 'Los Angeles', to: 'ANC', toCity: 'Anchorage', depart: '9:05 AM', arrive: '1:20 PM', duration: '5h 15m', gate: 'T3 · 34', seat: '18F', boarding: '8:25 AM' },
      { direction: 'Return', airline: 'American Airlines', flightNo: 'AA 2290', confirmation: 'L8KKJH', date: '11/10/26', from: 'ANC', fromCity: 'Anchorage', to: 'LAX', toCity: 'Los Angeles', depart: '11:40 PM', arrive: '6:05 AM', duration: '5h 25m', gate: 'C9', seat: '22A', boarding: '11:00 PM' },
    ],
    groundAfter: { airport: 'Anchorage Airport', miles: 237, minutes: 270 },
    airport: { code: 'ANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage, AK' },
    options: [
      { airline: 'American Airlines', flightNo: 'AA 2290', depart: '6:30 AM', arrive: '4:10 PM', duration: '8h 40m', stops: '1 stop', price: 371, url: 'https://www.aa.com/booking/find-flights' },
      { airline: 'Alaska Airlines', flightNo: 'AS 3', depart: '8:15 AM', arrive: '12:35 PM', duration: '5h 20m', stops: 'Nonstop', price: 389, url: 'https://www.alaskaair.com/' },
      { airline: 'Delta', flightNo: 'DL 1457', depart: '9:05 AM', arrive: '1:20 PM', duration: '5h 15m', stops: 'Nonstop', price: 456, url: 'https://www.delta.com/flightsearch/book-a-flight' },
      { airline: 'United', flightNo: 'UA 1634', depart: '10:10 AM', arrive: '2:30 PM', duration: '5h 20m', stops: 'Nonstop', price: 498, url: 'https://www.united.com/en/us/fsr/choose-flights' },
    ],
  },
  {
    id: 't7', title: 'Zion Narrows Weekend', club: 'Front Range Hikers', clubId: 'club-15', category: 'Hiking', image: pic.hike5, dateLabel: 'Saturday, November 12', shortDay: 'Sat', shortDate: '12', time: '7:00 AM – 4:00 PM', startMin: 7 * 60, location: 'Zion National Park, Utah', locationNote: 'Water hike · Moderate', miles: 430, objective: 'Wade through the Virgin River narrows with a local guide. Dry suits provided.', slots: 6, capacity: 14, weather: 'Sunny 61°F', tone: 'pink',
    groundAfter: { airport: 'Las Vegas Airport', miles: 160, minutes: 165 },
    airport: { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas, NV' },
    options: [
      { airline: 'Spirit', flightNo: 'NK 1042', depart: '11:05 AM', arrive: '12:20 PM', duration: '1h 15m', stops: 'Nonstop', price: 64, url: 'https://www.spirit.com/' },
      { airline: 'Southwest', flightNo: 'WN 1186', depart: '1:15 PM', arrive: '2:30 PM', duration: '1h 15m', stops: 'Nonstop', price: 89, url: 'https://www.southwest.com/air/booking/' },
      { airline: 'American Airlines', flightNo: 'AA 2217', depart: '12:00 PM', arrive: '1:15 PM', duration: '1h 15m', stops: 'Nonstop', price: 118, url: 'https://www.aa.com/booking/find-flights' },
      { airline: 'Delta', flightNo: 'DL 1860', depart: '2:40 PM', arrive: '3:55 PM', duration: '1h 15m', stops: 'Nonstop', price: 142, url: 'https://www.delta.com/flightsearch/book-a-flight' },
    ],
  },
]

// Trips created at runtime (club events, personal events) are registered so any screen can look them up.
const registry: Trip[] = [...trips]
export const tripById = (id: string) => registry.find((t) => t.id === id)!
const register = (t: Trip) => {
  if (!registry.some((r) => r.id === t.id)) registry.push(t)
  return tripById(t.id)
}

const fullDays: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
const fullMonths: Record<string, string> = { Oct: 'October', Nov: 'November', Dec: 'December' }
const farMiles: Record<string, number> = { '10001': 2450, '78701': 1380, '98101': 960, '80202': 830, '60601': 1745 }
const tones: Trip['tone'][] = ['lime', 'blue', 'pink']

function parseTime(t: string) {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 9 * 60
  return (Number(m[1]) % 12) * 60 + Number(m[2]) + (m[3].toUpperCase() === 'PM' ? 720 : 0)
}

// Turns a club event string like "Sat, Oct 22 · 6:30 AM" into a schedulable trip.
export function clubEventTrip(club: Club, title: string, when: string, spots: number, n: number): Trip {
  const existing = trips.find((t) => t.title === title)
  if (existing) return existing
  const [datePart, timePart = '9:00 AM'] = when.split(' · ')
  const [day, md] = datePart.split(', ')
  const [mon, dateStr] = md.split(' ')
  const start = parseTime(timePart)
  const area = areas[club.zip]
  return register({
    id: `ce-${club.id}-${n}`,
    title,
    club: club.name,
    clubId: club.id,
    category: club.category,
    image: club.image,
    dayIndex: mon === 'Oct' && Number(dateStr) >= 17 && Number(dateStr) <= 23 ? Number(dateStr) - 17 : undefined,
    dateLabel: `${fullDays[day] ?? day}, ${fullMonths[mon] ?? mon} ${dateStr}`,
    shortDay: day,
    shortDate: dateStr.padStart(2, '0'),
    time: `${timePart} – ${formatClock(start + 120)}`,
    startMin: start,
    location: `${area.city}, ${area.state}`,
    locationNote: `Hosted by ${club.name}`,
    miles: club.zip === HOME.zip ? distanceFor(club, HOME.zip) : farMiles[club.zip] ?? 500,
    objective: club.mission,
    slots: spots,
    capacity: spots + 10,
    weather: 'Clear 70°F',
    tone: tones[n % 3],
  })
}

export interface CustomEventInput {
  title: string
  date: string
  time: string
  location: string
  notes: string
}

let customCount = 0

export function createPersonalEvent(input: CustomEventInput): Trip {
  const [y, m, d] = input.date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const start = input.time ? Number(input.time.split(':')[0]) * 60 + Number(input.time.split(':')[1]) : 9 * 60
  const inWeek = y === 2026 && m === 10 && d >= 17 && d <= 23
  return register({
    id: `custom-${++customCount}-${Date.now()}`,
    title: input.title,
    club: 'Personal',
    clubId: '',
    category: 'Personal',
    image: pic.trail,
    dayIndex: inWeek ? d - 17 : undefined,
    dateLabel: dt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
    shortDay: dt.toLocaleDateString([], { weekday: 'short' }),
    shortDate: String(d).padStart(2, '0'),
    time: input.time ? formatClock(start) : 'All day',
    startMin: start,
    location: input.location || 'No location set',
    locationNote: input.notes || 'Personal event',
    miles: 0,
    objective: input.notes,
    slots: 0,
    capacity: 0,
    weather: '',
    tone: tones[customCount % 3],
    personal: true,
  })
}

export const needsFlight = (t: Trip) => t.miles > FLIGHT_THRESHOLD_MILES && !!t.airport && !!t.options?.length

export const sortedOptions = (t: Trip) => [...(t.options ?? [])].sort((a, b) => a.price - b.price)
export const cheapestOption = (t: Trip) => sortedOptions(t)[0]

// ISO date for the flight search, based on the day before the event for far trips.
const isoDates: Record<string, string> = { t5: '2026-10-22', t6: '2026-11-06', t7: '2026-11-11' }

// Opens a schedule search from home to the airport nearest the venue.
export function scheduleUrl(t: Trip) {
  const q = `Flights from LAX to ${t.airport?.code} on ${isoDates[t.id] ?? ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function driveMinutes(miles: number) {
  // Local streets are slower than highway driving.
  const mph = miles < 60 ? 28 : 58
  return Math.round(((miles * 1.15) / mph) * 60)
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export function formatClock(totalMinutes: number) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export const leaveBy = (t: Trip) => formatClock(t.startMin - driveMinutes(t.miles) - 15)

// Deterministic pseudo QR pattern seeded from the confirmation code.
export function qrCells(seed: string, size = 21) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox
        const dy = y - oy
        const edge = dx === 0 || dx === 6 || dy === 0 || dy === 6
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
        return edge || core
      }
      if (x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7) return false
    }
    return null
  }
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const f = finder(x, y)
      return f === null ? next() > 0.5 : f
    }),
  )
}