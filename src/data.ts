export type Tab = 'home' | 'schedule' | 'feed' | 'search' | 'profile'

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=${w}`

export const hikeImage = img('1566353820666-883ec100f41b', 1200)
export const trailImage = img('1667761618783-0f2148c07a1e', 1200)
export const ridgeImage = img('1787240663846-598e1033a919', 1200)

export const pic = {
  hike: img('1566353820666-883ec100f41b'),
  hike2: img('1729591476636-2c3775329213'),
  hike3: img('1789333999249-8540dc7be468'),
  hike4: img('1770563181834-84edf4cedb07'),
  hike5: img('1770563182000-42b78845bc91'),
  ridge: img('1787240663846-598e1033a919'),
  trail: img('1667761618783-0f2148c07a1e'),
  climb: img('1564769662533-4f00a87b4056'),
  climb2: img('1520156557489-31c63271fcd4'),
  kayak: img('1766832945539-dca69ec08eb2'),
  kayak2: img('1614808317315-4807afbab5eb'),
  canoe: img('1569965335962-2317ff2a7658'),
  cycle: img('1735216228027-fe31c23474ce'),
  cycle2: img('1613624071382-72a34057b021'),
  run: img('1590333748338-d629e4564ad9'),
  run2: img('1552674605-db6ffd4facb5'),
  yoga: img('1758274535230-3641d0632878'),
  yoga2: img('1758274526045-2bd03dcc64d2'),
  volley: img('1673058577973-68b6b6d53ccd'),
  camp: img('1486679679458-629f321a617c'),
  camp2: img('1609788063095-d71bf3c1f01f'),
}

export type Category = 'Hiking' | 'Climbing' | 'Water' | 'Cycling' | 'Running' | 'Wellness' | 'Camping' | 'Team sports'

export interface Club {
  id: string
  name: string
  category: Category
  zip: string
  image: string
  members: number
  mission: string
  about: string
  founded: number
  meets: string
  level: string
  owner: string
  email: string
  nextEvent: string
  nextWhen: string
  spots: number
  announcements: string[]
  gallery: string[]
}

export interface Area {
  city: string
  state: string
}

export const areas: Record<string, Area> = {
  '90027': { city: 'Los Angeles', state: 'CA' },
  '10001': { city: 'New York', state: 'NY' },
  '78701': { city: 'Austin', state: 'TX' },
  '98101': { city: 'Seattle', state: 'WA' },
  '80202': { city: 'Denver', state: 'CO' },
  '60601': { city: 'Chicago', state: 'IL' },
}

interface Seed {
  name: string
  category: Category
  zip: string
  image: string
  members: number
  mission: string
  about: string
  founded: number
  meets: string
  level: string
  owner: string
  event: string
  when: string
  spots: number
  gallery: string[]
}

const seeds: Seed[] = [
  { name: 'Horizon Hikers', category: 'Hiking', zip: '90027', image: pic.hike, members: 1243, mission: 'Get more people onto the trail, and make sure nobody hikes alone.', about: 'Weekly sunrise and sunset hikes across the Santa Monica Mountains and Griffith Park. We carpool, share snacks, and always wait for the slowest hiker.', founded: 2019, meets: 'Saturdays 6:30 AM and Wednesdays 5:30 PM', level: 'All levels', owner: 'Nia Alvarez', event: 'Sunrise at Eagle Rock', when: 'Sat, Oct 22 · 6:30 AM', spots: 4, gallery: [pic.hike2, pic.ridge, pic.hike4, pic.trail] },
  { name: 'Griffith Run Crew', category: 'Running', zip: '90027', image: pic.run, members: 612, mission: 'Make running social, supportive, and a little bit addictive.', about: 'Three pace groups, one finish line. Easy miles through Los Feliz and long runs on the hills, followed by coffee together.', founded: 2021, meets: 'Tuesdays and Thursdays 6:00 PM', level: 'Beginner friendly', owner: 'Marcus Cole', event: 'Hollywood Reservoir Loop', when: 'Tue, Oct 25 · 6:00 PM', spots: 12, gallery: [pic.run2, pic.run, pic.cycle2, pic.trail] },
  { name: 'Silver Lake Yogis', category: 'Wellness', zip: '90027', image: pic.yoga, members: 388, mission: 'Slow down outdoors and stretch together in the open air.', about: 'Free community yoga in parks around Silver Lake and Echo Park. Bring a mat and water. We bring the good vibes and playlists.', founded: 2020, meets: 'Sundays 8:00 AM', level: 'All levels', owner: 'Priya Shah', event: 'Sunset Flow in the Park', when: 'Sun, Oct 23 · 5:30 PM', spots: 9, gallery: [pic.yoga2, pic.yoga, pic.camp2, pic.hike3] },
  { name: 'Pacific Paddle Club', category: 'Water', zip: '90027', image: pic.kayak, members: 274, mission: 'Introduce Angelenos to the coast and calm waters nearby.', about: 'Kayak and paddleboard outings with gear rentals included for new members. Safety lessons at the start of every trip.', founded: 2018, meets: 'Alternate Saturdays 9:00 AM', level: 'Beginner to intermediate', owner: 'Daniel Reyes', event: 'Marina Morning Paddle', when: 'Sat, Oct 29 · 9:00 AM', spots: 6, gallery: [pic.kayak2, pic.canoe, pic.kayak, pic.hike2] },

  { name: 'Hudson Cyclists', category: 'Cycling', zip: '10001', image: pic.cycle, members: 957, mission: 'Make riding in the city safer, faster, and a lot more fun.', about: 'Group rides on the Hudson River Greenway and out to the Palisades. Multiple pace groups and plenty of bagel stops.', founded: 2016, meets: 'Sundays 7:00 AM', level: 'Intermediate', owner: 'Ava Chen', event: 'Palisades Climb Ride', when: 'Sun, Oct 23 · 7:00 AM', spots: 7, gallery: [pic.cycle2, pic.cycle, pic.run, pic.trail] },
  { name: 'Brooklyn Boulder Social', category: 'Climbing', zip: '10001', image: pic.climb, members: 702, mission: 'Build a welcoming climbing community for every body and every grade.', about: 'Indoor bouldering nights, technique clinics, and outdoor trips to the Gunks. Shoes can be rented at the gym.', founded: 2018, meets: 'Mondays and Fridays 7:00 PM', level: 'All levels', owner: 'Sofia Rinaldi', event: 'Boulder Social Night', when: 'Mon, Oct 24 · 7:00 PM', spots: 8, gallery: [pic.climb2, pic.climb, pic.ridge, pic.hike3] },
  { name: 'Central Park Run Club', category: 'Running', zip: '10001', image: pic.run2, members: 1520, mission: 'Run together, finish together, and celebrate everyone.', about: 'One of the largest social run clubs in Manhattan. Loops around the reservoir with after-run meetups.', founded: 2015, meets: 'Wednesdays 6:30 PM and Saturdays 8:00 AM', level: 'All paces', owner: 'Lena Brooks', event: 'Reservoir Social Run', when: 'Wed, Oct 26 · 6:30 PM', spots: 20, gallery: [pic.run, pic.run2, pic.cycle2, pic.yoga] },

  { name: 'Barton Springs Paddlers', category: 'Water', zip: '78701', image: pic.kayak2, members: 489, mission: 'Keep Austin on the water and keep our water clean.', about: 'Paddle trips on Lady Bird Lake, with a cleanup bag on every boat. Sunset paddles are the crowd favorite.', founded: 2017, meets: 'Saturdays 8:30 AM', level: 'Beginner friendly', owner: 'Daniel Reyes', event: 'Lady Bird Sunset Paddle', when: 'Sat, Oct 22 · 5:00 PM', spots: 5, gallery: [pic.kayak, pic.canoe, pic.kayak2, pic.hike] },
  { name: 'Austin Gravel Riders', category: 'Cycling', zip: '78701', image: pic.cycle2, members: 336, mission: 'Explore Hill Country back roads on two wheels.', about: 'Dirt, gravel, and tacos. Mid-distance rides on quiet roads with a no-drop policy.', founded: 2020, meets: 'Sundays 7:30 AM', level: 'Intermediate', owner: 'Marcus Cole', event: 'Hill Country Gravel 40', when: 'Sun, Oct 23 · 7:30 AM', spots: 10, gallery: [pic.cycle, pic.cycle2, pic.trail, pic.hike5] },
  { name: 'Hill Country Hikers', category: 'Hiking', zip: '78701', image: pic.hike4, members: 804, mission: 'Share the best of Texas trails with anyone who wants to explore.', about: 'Day hikes and overnight trips across the Texas Hill Country. We organize carpools from downtown Austin.', founded: 2018, meets: 'Saturdays 7:00 AM', level: 'All levels', owner: 'Lena Brooks', event: 'Barton Creek Greenbelt', when: 'Sat, Oct 22 · 7:00 AM', spots: 11, gallery: [pic.hike5, pic.hike4, pic.ridge, pic.camp] },
  { name: 'Lone Star Volley', category: 'Team sports', zip: '78701', image: pic.volley, members: 241, mission: 'Weekend volleyball for anyone who loves a good rally.', about: 'Casual sand volleyball with rotating teams so everyone plays with everyone. Beginners are welcome.', founded: 2022, meets: 'Sundays 3:00 PM', level: 'Beginner friendly', owner: 'Ava Chen', event: 'Sunday Sand Session', when: 'Sun, Oct 23 · 3:00 PM', spots: 14, gallery: [pic.volley, pic.yoga, pic.run, pic.camp2] },

  { name: 'Cascade Climbers', category: 'Climbing', zip: '98101', image: pic.climb2, members: 1104, mission: 'Teach safe climbing and protect the crags we love.', about: 'Indoor sessions all week and alpine trips on weekends. Gear library and mentors for new climbers.', founded: 2012, meets: 'Tuesdays 7:00 PM and Saturdays', level: 'All levels', owner: 'Sofia Rinaldi', event: 'Intro to Lead Climbing', when: 'Tue, Oct 25 · 7:00 PM', spots: 3, gallery: [pic.climb, pic.climb2, pic.hike3, pic.ridge] },
  { name: 'Puget Sound Kayak Crew', category: 'Water', zip: '98101', image: pic.kayak, members: 567, mission: 'Explore the Salish Sea safely and respectfully.', about: 'Guided sea kayak outings and skills nights. We follow leave-no-trace principles on every trip.', founded: 2014, meets: 'Alternate Sundays 9:00 AM', level: 'Intermediate', owner: 'Daniel Reyes', event: 'Alki Beach Paddle', when: 'Sun, Oct 23 · 9:00 AM', spots: 6, gallery: [pic.kayak2, pic.canoe, pic.kayak, pic.hike2] },
  { name: 'Emerald Trail Runners', category: 'Running', zip: '98101', image: pic.run2, members: 873, mission: 'Take running off the pavement and into the trees.', about: 'Trail runs in the rain, sun, and everything in between. Headlamps required in winter.', founded: 2017, meets: 'Thursdays 6:00 PM', level: 'Intermediate', owner: 'Priya Shah', event: 'Discovery Park Loop', when: 'Thu, Oct 27 · 6:00 PM', spots: 12, gallery: [pic.run, pic.hike5, pic.trail, pic.hike4] },
  { name: 'Evergreen Campers', category: 'Camping', zip: '98101', image: pic.camp, members: 428, mission: 'Make camping easy for beginners and fun for veterans.', about: 'Monthly weekend camping trips, shared meals, and gear swaps. We handle the reservations so you can bring marshmallows.', founded: 2019, meets: 'Monthly weekends', level: 'Beginner friendly', owner: 'Lena Brooks', event: 'Fall Campout at Deception Pass', when: 'Fri, Oct 28 · 4:00 PM', spots: 8, gallery: [pic.camp2, pic.camp, pic.hike4, pic.ridge] },

  { name: 'Front Range Hikers', category: 'Hiking', zip: '80202', image: pic.hike5, members: 1388, mission: 'Help everyone experience the Rockies, one trail at a time.', about: 'From Red Rocks to the high peaks. Trip leaders post difficulty and elevation gain for every outing.', founded: 2013, meets: 'Saturdays 6:00 AM', level: 'All levels', owner: 'Nia Alvarez', event: 'Mount Falcon Trail', when: 'Sat, Oct 22 · 6:00 AM', spots: 9, gallery: [pic.hike3, pic.hike5, pic.ridge, pic.hike2] },
  { name: 'Mile High Cyclists', category: 'Cycling', zip: '80202', image: pic.cycle, members: 745, mission: 'Ride higher, ride together.', about: 'Road and gravel rides from downtown Denver into the foothills. We keep a no-drop policy on social rides.', founded: 2016, meets: 'Sundays 8:00 AM', level: 'Intermediate', owner: 'Ava Chen', event: 'Lookout Mountain Ride', when: 'Sun, Oct 23 · 8:00 AM', spots: 6, gallery: [pic.cycle2, pic.cycle, pic.trail, pic.run] },
  { name: 'Boulder Crag Club', category: 'Climbing', zip: '80202', image: pic.climb, members: 612, mission: 'Climb more, climb safer, climb together.', about: 'Outdoor climbing in Clear Creek and indoor sessions during winter. Experienced mentors on every trip.', founded: 2015, meets: 'Wednesdays 7:00 PM', level: 'Intermediate', owner: 'Sofia Rinaldi', event: 'Clear Creek Top-Rope Day', when: 'Sat, Oct 29 · 8:00 AM', spots: 4, gallery: [pic.climb2, pic.climb, pic.hike3, pic.ridge] },
  { name: 'Sunset Yoga Collective', category: 'Wellness', zip: '80202', image: pic.yoga2, members: 291, mission: 'A calm hour outdoors for every busy week.', about: 'Free community yoga in Cheesman Park at golden hour. Mats available to borrow.', founded: 2021, meets: 'Fridays 5:30 PM', level: 'All levels', owner: 'Priya Shah', event: 'Golden Hour Flow', when: 'Fri, Oct 28 · 5:30 PM', spots: 15, gallery: [pic.yoga, pic.yoga2, pic.hike, pic.camp2] },

  { name: 'Lakefront Runners', category: 'Running', zip: '60601', image: pic.run, members: 1672, mission: 'Run the lakefront together, at every pace.', about: 'Runs on the 606 and the lakefront trail. We celebrate every finish line, from the first mile to the marathon.', founded: 2014, meets: 'Tuesdays and Saturdays', level: 'All paces', owner: 'Marcus Cole', event: 'Lakefront Long Run', when: 'Sat, Oct 22 · 7:30 AM', spots: 18, gallery: [pic.run2, pic.run, pic.cycle2, pic.yoga2] },
  { name: 'Windy City Cyclists', category: 'Cycling', zip: '60601', image: pic.cycle2, members: 903, mission: 'Make Chicago a better city to ride a bike in.', about: 'Social rides, advocacy nights, and weekend trips to the Indiana Dunes.', founded: 2013, meets: 'Sundays 8:00 AM', level: 'All levels', owner: 'Ava Chen', event: 'Lakeshore Sunday Ride', when: 'Sun, Oct 23 · 8:00 AM', spots: 12, gallery: [pic.cycle, pic.cycle2, pic.run, pic.trail] },
  { name: 'Lakeshore Volley', category: 'Team sports', zip: '60601', image: pic.volley, members: 358, mission: 'Beach volleyball for everyone, rain or shine.', about: 'Sand volleyball at North Avenue Beach with mixed levels and rotating teams.', founded: 2019, meets: 'Wednesdays 6:00 PM', level: 'Beginner friendly', owner: 'Lena Brooks', event: 'Wednesday Beach Games', when: 'Wed, Oct 26 · 6:00 PM', spots: 16, gallery: [pic.volley, pic.run2, pic.yoga, pic.camp2] },
  { name: 'Northwoods Campfire Club', category: 'Camping', zip: '60601', image: pic.camp2, members: 519, mission: 'Take more weekends outside, around a fire with good people.', about: 'Car camping trips to Wisconsin and Michigan state parks. Shared meals and a very serious s’mores policy.', founded: 2018, meets: 'Monthly weekends', level: 'Beginner friendly', owner: 'Daniel Reyes', event: 'Kettle Moraine Weekend', when: 'Fri, Oct 28 · 4:00 PM', spots: 7, gallery: [pic.camp, pic.camp2, pic.hike4, pic.hike2] },
]

export const clubs: Club[] = seeds.map((s, i) => ({
  id: `club-${i}`,
  name: s.name,
  category: s.category,
  zip: s.zip,
  image: s.image,
  members: s.members,
  mission: s.mission,
  about: s.about,
  founded: s.founded,
  meets: s.meets,
  level: s.level,
  owner: s.owner,
  email: `hello@${s.name.toLowerCase().replace(/[^a-z]+/g, '')}.club`,
  nextEvent: s.event,
  nextWhen: s.when,
  spots: s.spots,
  announcements: [
    `New member welcome meetup this month. Come say hi and meet the organizers.`,
    `Next up: ${s.event}. ${s.spots} spots left, so reserve early.`,
    `Reminder: bring water, wear the right shoes, and check the weather before you head out.`,
  ],
  gallery: s.gallery,
}))

export const clubById = (id: string) => clubs.find((c) => c.id === id)!

// Deterministic fake distance (miles) so results stay stable between searches.
export function distanceFor(club: Club, zip: string) {
  let h = 0
  for (const ch of club.name + zip) h = (h * 31 + ch.charCodeAt(0)) % 997
  const base = club.zip === zip ? 0.4 : 2.5
  return Math.round((base + (h % 38) / 10) * 10) / 10
}

export interface Person {
  id: string
  name: string
  handle: string
  photo: string
  bio: string
  followers: number
  clubIds: string[]
  mutual: number
}

export const people: Person[] = [
  { id: 'p1', name: 'Maya Ortiz', handle: 'mayaoutside', photo: img('1494790108377-be9c29b29330', 400), bio: 'Sunrise hiker. Trail snack enthusiast.', followers: 2140, clubIds: ['club-0', 'club-1'], mutual: 3 },
  { id: 'p2', name: 'Daniel Reyes', handle: 'danpaddles', photo: img('1564564244660-5d73c057f2d2', 400), bio: 'Kayak guide and weekend camper.', followers: 982, clubIds: ['club-3', 'club-6'], mutual: 2 },
  { id: 'p3', name: 'Priya Shah', handle: 'priyaflows', photo: img('1592275772614-ec71b19e326f', 400), bio: 'Yoga teacher. Outdoors whenever possible.', followers: 3310, clubIds: ['club-2', 'club-18'], mutual: 5 },
  { id: 'p4', name: 'Lena Brooks', handle: 'lenaruns', photo: img('1525134479668-1bee5c7c6845', 400), bio: 'Marathon number six, loading.', followers: 1604, clubIds: ['club-5', 'club-16'], mutual: 1 },
  { id: 'p5', name: 'Marcus Cole', handle: 'marcusrides', photo: img('1527980965255-d3b416303d12', 400), bio: 'Gravel miles and good coffee.', followers: 754, clubIds: ['club-1', 'club-7'], mutual: 4 },
  { id: 'p6', name: 'Sofia Rinaldi', handle: 'sofiasends', photo: img('1548382131-e0ebb1f0cdea', 400), bio: 'Climbing coach. V6 on a good day.', followers: 1890, clubIds: ['club-5', 'club-10'], mutual: 2 },
  { id: 'p7', name: 'Ava Chen', handle: 'avawheels', photo: img('1669689290695-7f0efe5d4c8e', 400), bio: 'Road bikes and rooftop sunsets.', followers: 1215, clubIds: ['club-4', 'club-13'], mutual: 3 },
]

export interface MediaItem {
  id: string
  type: 'photo' | 'video'
  image: string
  duration?: string
  caption: string
  author: string
  place: string
  likes: number
  tall: boolean
}

export const media: MediaItem[] = [
  { id: 'm1', type: 'photo', image: pic.ridge, caption: 'Above the fog by 7am. Worth every switchback.', author: 'p1', place: 'Mount Baldy, CA', likes: 428, tall: true },
  { id: 'm2', type: 'video', image: pic.kayak, duration: '0:24', caption: 'Glass-calm morning on the lake.', author: 'p2', place: 'Lady Bird Lake, TX', likes: 312, tall: false },
  { id: 'm3', type: 'photo', image: pic.yoga, caption: 'Sunday flow with the crew.', author: 'p3', place: 'Echo Park, CA', likes: 275, tall: false },
  { id: 'm4', type: 'video', image: pic.cycle, duration: '0:41', caption: 'Peloton rolling out at sunrise.', author: 'p7', place: 'Hudson Greenway, NY', likes: 590, tall: true },
  { id: 'm5', type: 'photo', image: pic.climb, caption: 'Finally sent the purple problem.', author: 'p6', place: 'Brooklyn, NY', likes: 203, tall: true },
  { id: 'm6', type: 'photo', image: pic.camp, caption: 'Fireside stories and cold toes.', author: 'p2', place: 'Deception Pass, WA', likes: 351, tall: false },
  { id: 'm7', type: 'video', image: pic.run, duration: '0:15', caption: 'Tuesday track night energy.', author: 'p4', place: 'Chicago, IL', likes: 166, tall: false },
  { id: 'm8', type: 'photo', image: pic.hike5, caption: 'Trail crew, assemble.', author: 'p5', place: 'Red Rocks, CO', likes: 244, tall: true },
  { id: 'm9', type: 'photo', image: pic.volley, caption: 'Sunday sand session. Final score: who cares.', author: 'p7', place: 'Austin, TX', likes: 129, tall: false },
  { id: 'm10', type: 'video', image: pic.trail, duration: '1:02', caption: 'Group walk to the overlook.', author: 'p1', place: 'Griffith Park, CA', likes: 487, tall: false },
]

export const personById = (id: string) => people.find((p) => p.id === id)!
