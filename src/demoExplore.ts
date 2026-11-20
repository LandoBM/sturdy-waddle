import { Image } from 'react-native'
import type { Post } from './posts'
import type { Trip } from './trips'

const eventImages = {
  'demo-event-01': require('../assets/explore/events/01_tempo_night_reservoir.jpg'),
  'demo-event-02': require('../assets/explore/events/02_sunset_flow_park.jpg'),
  'demo-event-03': require('../assets/explore/events/03_golden_hour_ridge_walk.jpg'),
  'demo-event-04': require('../assets/explore/events/04_weekend_cycling_social.jpg'),
  'demo-event-05': require('../assets/explore/events/05_joshua_tree_bouldering.jpg'),
  'demo-event-06': require('../assets/explore/events/06_beach_cycling_meetup.jpg'),
} as const

const momentImages = {
  'demo-moment-01': require('../assets/explore/moments/01_hiking_friends.jpg'),
  'demo-moment-02': require('../assets/explore/moments/02_trail_runner.jpg'),
  'demo-moment-03': require('../assets/explore/moments/03_post_run_selfie.jpg'),
  'demo-moment-04': require('../assets/explore/moments/04_beach_volleyball.jpg'),
  'demo-moment-05': require('../assets/explore/moments/05_la_skyline.jpg'),
  'demo-moment-06': require('../assets/explore/moments/06_park_yoga.jpg'),
  'demo-moment-07': require('../assets/explore/moments/07_road_cycling.jpg'),
  'demo-moment-08': require('../assets/explore/moments/08_group_trail_run.jpg'),
  'demo-moment-09': require('../assets/explore/moments/09_sunset_view.jpg'),
  'demo-moment-10': require('../assets/explore/moments/10_cycling_friends.jpg'),
  'demo-moment-11': require('../assets/explore/moments/11_running_crew.jpg'),
  'demo-moment-12': require('../assets/explore/moments/12_yoga_community.jpg'),
} as const

const assetUri = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? ''

const dateFor = (daysFromToday: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + daysFromToday)
  return date
}

const tripDate = (daysFromToday: number, startHour: number, startMinute: number, durationHours: number) => {
  const date = dateFor(daysFromToday)
  const endMinutes = startHour * 60 + startMinute + durationHours * 60
  const formatTime = (minutes: number) => {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const suffix = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
  }
  return {
    eventDate: date.toISOString().slice(0, 10),
    dateLabel: date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    shortDay: date.toLocaleDateString([], { weekday: 'short' }),
    shortDate: String(date.getDate()).padStart(2, '0'),
    time: `${formatTime(startHour * 60 + startMinute)} – ${formatTime(endMinutes)}`,
    startMin: startHour * 60 + startMinute,
  }
}

const event = (input: Omit<Trip, 'eventDate' | 'dateLabel' | 'shortDay' | 'shortDate' | 'time' | 'startMin'> & { daysFromToday: number; startHour: number; startMinute: number; durationHours: number; difficulty: string; imageSource: number }): Trip & { difficulty: string; demo: true; imageSource: number } => ({
  ...input,
  ...tripDate(input.daysFromToday, input.startHour, input.startMinute, input.durationHours),
  demo: true,
})

export const demoExploreEvents: Array<Trip & { difficulty: string; demo: true }> = [
  event({ id: 'demo-event-01', title: 'Tempo Night at the Reservoir', club: 'Griffith Run Crew', clubId: 'demo-griffith-run-crew', category: 'Running', image: assetUri(eventImages['demo-event-01']), imageSource: eventImages['demo-event-01'], location: 'Hollywood Reservoir, Los Angeles, CA', locationNote: '5 mile loop · Easy to moderate', miles: 6, objective: 'Run a steady five-mile tempo loop with pace groups for every level.', slots: 14, capacity: 20, weather: 'Clear 72°F', tone: 'lime', daysFromToday: 3, startHour: 18, startMinute: 0, durationHours: 1.5, difficulty: 'Easy to moderate' }),
  event({ id: 'demo-event-02', title: 'Sunset Flow in the Park', club: 'Silver Lake Yogis', clubId: 'demo-silver-lake-yogis', category: 'Yoga', image: assetUri(eventImages['demo-event-02']), imageSource: eventImages['demo-event-02'], location: 'Echo Park Lake, Los Angeles, CA', locationNote: 'Bring a mat and water', miles: 4, objective: 'Slow flow yoga on the lawn as the sun goes down. All levels welcome.', slots: 19, capacity: 25, weather: 'Clear 70°F', tone: 'blue', daysFromToday: 5, startHour: 17, startMinute: 30, durationHours: 1.25, difficulty: 'All levels' }),
  event({ id: 'demo-event-03', title: 'Golden Hour Ridge Walk', club: 'Horizon Hikers', clubId: 'demo-horizon-hikers', category: 'Hiking', image: assetUri(eventImages['demo-event-03']), imageSource: eventImages['demo-event-03'], location: 'Griffith Park, Los Angeles, CA', locationNote: '2.8 miles · Moderate', miles: 14, objective: 'Walk the ridge at golden hour and take in the best views of the city.', slots: 12, capacity: 20, weather: 'Cloudy 68°F', tone: 'lime', daysFromToday: 7, startHour: 16, startMinute: 30, durationHours: 2.75, difficulty: 'Moderate' }),
  event({ id: 'demo-event-04', title: 'Weekend Cycling Social', club: 'LA Cycling Collective', clubId: 'demo-la-cycling-collective', category: 'Cycling', image: assetUri(eventImages['demo-event-04']), imageSource: eventImages['demo-event-04'], location: 'Los Angeles, CA', locationNote: '12 miles · Social pace', miles: 10, objective: 'A relaxed social ride through Los Angeles with regroup points and coffee afterward.', slots: 22, capacity: 30, weather: 'Sunny 74°F', tone: 'blue', daysFromToday: 11, startHour: 8, startMinute: 0, durationHours: 2, difficulty: 'Beginner friendly' }),
  event({ id: 'demo-event-05', title: 'Joshua Tree Bouldering Weekend', club: 'Horizon Hikers', clubId: 'demo-horizon-hikers', category: 'Climbing', image: assetUri(eventImages['demo-event-05']), imageSource: eventImages['demo-event-05'], location: 'Joshua Tree, CA', locationNote: 'Day climbing · All levels', miles: 138, objective: 'Boulder among the desert rocks with mentors for every grade. Crash pads provided.', slots: 5, capacity: 12, weather: 'Sunny 82°F', tone: 'lime', daysFromToday: 13, startHour: 10, startMinute: 0, durationHours: 5, difficulty: 'All levels' }),
  event({ id: 'demo-event-06', title: 'Beach Cycling Meetup', club: 'Coastal Active Club', clubId: 'demo-coastal-active', category: 'Cycling', image: assetUri(eventImages['demo-event-06']), imageSource: eventImages['demo-event-06'], location: 'Santa Monica, CA', locationNote: 'Open ride · All levels', miles: 18, objective: 'Meet new people for a relaxed beachside ride and a post-ride walk.', slots: 16, capacity: 24, weather: 'Sunny 76°F', tone: 'pink', daysFromToday: 14, startHour: 10, startMinute: 0, durationHours: 3, difficulty: 'All levels' }),
]

const demoMomentData = [
  ['demo-moment-01', 'Maya Brooks', 'Sunrise miles with the crew.', assetUri(momentImages['demo-moment-01'])],
  ['demo-moment-02', 'Nia Alvarez', 'Above the fog before breakfast.', assetUri(momentImages['demo-moment-02'])],
  ['demo-moment-03', 'Jordan Lee', 'The best kind of weekend loop.', assetUri(momentImages['demo-moment-03'])],
  ['demo-moment-04', 'Priya Shah', 'Park flow, golden hour edition.', assetUri(momentImages['demo-moment-04'])],
  ['demo-moment-05', 'Alex Morgan', 'One more move before sunset.', assetUri(momentImages['demo-moment-05'])],
  ['demo-moment-06', 'Sam Rivera', 'Sand, sun, and a close match.', assetUri(momentImages['demo-moment-06'])],
  ['demo-moment-07', 'Taylor Kim', 'Outdoor strength circuit complete.', assetUri(momentImages['demo-moment-07'])],
  ['demo-moment-08', 'Chris Owens', 'Trail legs are happy legs.', assetUri(momentImages['demo-moment-08'])],
  ['demo-moment-09', 'Avery Chen', 'A little movement with good people.', assetUri(momentImages['demo-moment-09'])],
  ['demo-moment-10', 'Lena Brooks', 'Group rides make the miles easy.', assetUri(momentImages['demo-moment-10'])],
  ['demo-moment-11', 'Daniel Reyes', 'Worth the early alarm.', assetUri(momentImages['demo-moment-11'])],
  ['demo-moment-12', 'Sofia Rinaldi', 'Post-workout smiles all around.', assetUri(momentImages['demo-moment-12'])],
] as const

export const demoExploreMoments: Array<Post & { demo: true; mediaType: 'photo' | 'video' }> = demoMomentData.map(([id, author, text, image], index) => ({
  id,
  author,
  handle: author.toLowerCase().replace(/[^a-z]+/g, ''),
  mine: false,
  text,
  image,
  imageSource: momentImages[id as keyof typeof momentImages],
  time: 'Demo moment',
  likes: 0,
  comments: [],
  liked: false,
  saved: false,
  mediaType: index === 2 || index === 8 ? 'video' : 'photo',
  mediaUrl: index === 2 || index === 8 ? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' : undefined,
  thumbnail: image,
  durationSeconds: index === 2 || index === 8 ? 5 : undefined,
  demo: true,
}))
