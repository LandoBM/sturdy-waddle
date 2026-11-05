import { ridgeImage } from './data'

export interface Comment {
  id: string
  author: string
  mine: boolean
  text: string
  time: string
  likes: number
  liked: boolean
}

export interface Post {
  id: string
  author: string
  handle: string
  mine: boolean
  text: string
  image?: string
  location?: string
  club?: string
  time: string
  likes: number
  comments: Comment[]
  liked: boolean
  saved: boolean
}

export const ME = { name: 'Alex Kim', handle: 'alexoutside' }

const c = (id: string, author: string, text: string, time: string, likes = 0): Comment => ({ id, author, mine: false, text, time, likes, liked: false })

export const seedPosts: Post[] = [
  {
    id: 'seed-1', author: 'Nia Alvarez', handle: 'niahikes', mine: false,
    text: 'Nothing beats getting above the morning fog. First summit, definitely not the last.',
    image: ridgeImage, location: 'Mount Baldy', club: 'Horizon Hikers', time: '2h', likes: 128, liked: false, saved: false,
    comments: [
      c('c1', 'Maya Ortiz', 'That view though! What time did you start?', '1h', 6),
      c('c2', 'Nia Alvarez', 'Left the trailhead at 5:15. Totally worth the alarm.', '1h', 4),
      c('c3', 'Marcus Cole', 'Putting this on my list for next month.', '58m', 2),
      c('c4', 'Lena Brooks', 'The fog layer is unreal. Great shot.', '41m', 9),
      c('c5', 'Priya Shah', 'Take me next time!', '20m', 3),
    ],
  },
  {
    id: 'seed-2', author: 'Daniel Reyes', handle: 'danpaddles', mine: false,
    text: 'Anyone know a good beginner-friendly kayak spot near the marina? Bringing two first-timers this weekend.',
    club: 'Pacific Paddle Club', time: '4h', likes: 22, liked: false, saved: false,
    comments: [
      c('c6', 'Ava Chen', 'Mother’s Beach is calm and easy to launch from.', '3h', 7),
      c('c7', 'Sofia Rinaldi', 'Go early, the wind picks up after noon.', '3h', 5),
      c('c8', 'Daniel Reyes', 'Perfect, thank you both!', '2h', 1),
    ],
  },
  {
    id: 'seed-3', author: 'Priya Shah', handle: 'priyaflows', mine: false,
    text: 'Reminder that the best part of yoga in the park is the ten minutes of lying there afterwards. Come stretch with us Sunday.',
    club: 'Silver Lake Yogis', time: '6h', likes: 64, liked: false, saved: false,
    comments: [
      c('c9', 'Maya Ortiz', 'Saving my spot. Do we need to bring mats?', '5h', 2),
      c('c10', 'Priya Shah', 'Bring your own if you can, we have a few spares.', '5h', 3),
    ],
  },
]