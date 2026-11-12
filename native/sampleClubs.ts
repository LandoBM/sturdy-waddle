import { pic } from '../src/data'

export type SampleClub = {
  id: string
  name: string
  sport: string
  description: string
  coverImage: string
  group: string
  isSample: true
}

export type SampleClubGroup = {
  id: string
  name: string
  clubs: [SampleClub, SampleClub, SampleClub]
}

const sampleClub = (
  id: string,
  name: string,
  sport: string,
  description: string,
  coverImage: string,
  group: string,
): SampleClub => ({ id, name, sport, description, coverImage, group, isSample: true })

export const sampleClubGroups: SampleClubGroup[] = [
  {
    id: 'vertical-adventures',
    name: 'Vertical Adventures',
    clubs: [
      sampleClub('sample-crux-collective', 'Crux Collective', 'Bouldering', 'Low walls, big problems, and a crew that keeps the session moving.', pic.climb, 'Vertical Adventures'),
      sampleClub('sample-canyon-crew', 'Canyon Crew', 'Canyoneering', 'Technical routes, cold water, and careful planning beyond the trailhead.', pic.ridge, 'Vertical Adventures'),
      sampleClub('sample-balance-society', 'Balance Society', 'Slacklining', 'A relaxed outdoor practice for balance, focus, and better footwork.', pic.trail, 'Vertical Adventures'),
    ],
  },
  {
    id: 'water-wind',
    name: 'Water & Wind',
    clubs: [
      sampleClub('sample-wind-chasers', 'Wind Chasers', 'Kitesurfing', 'Chase clean wind, learn the setup, and stay out for the long ride home.', pic.kayak, 'Water & Wind'),
      sampleClub('sample-deep-blue-collective', 'Deep Blue Collective', 'Freediving', 'Breathwork, calm water, and a thoughtful approach to time below the surface.', pic.kayak2, 'Water & Wind'),
      sampleClub('sample-foil-society', 'Foil Society', 'Wing Foiling', 'Find your first lift and share the best launch windows with other riders.', pic.canoe, 'Water & Wind'),
    ],
  },
  {
    id: 'mountain-trail',
    name: 'Mountain & Trail',
    clubs: [
      sampleClub('sample-gravity-riders', 'Gravity Riders', 'Downhill Mountain Biking', 'Technical descents, trail days, and a crew that knows the value of a good line.', pic.cycle2, 'Mountain & Trail'),
      sampleClub('sample-off-grid-collective', 'Off Grid Collective', 'Bikepacking', 'Plan lighter, ride farther, and trade route notes around the camp stove.', pic.camp, 'Mountain & Trail'),
      sampleClub('sample-waypoint-crew', 'Waypoint Crew', 'Orienteering', 'Maps, bearings, and fast decisions for people who like finding their own way.', pic.hike4, 'Mountain & Trail'),
    ],
  },
  {
    id: 'snow-ice',
    name: 'Snow & Ice',
    clubs: [
      sampleClub('sample-frozen-ascent', 'Frozen Ascent', 'Ice Climbing', 'Learn the tools, read the conditions, and climb with a careful winter crew.', pic.climb2, 'Snow & Ice'),
      sampleClub('sample-split-society', 'Split Society', 'Splitboarding', 'Earn the descent with uphill days, route planning, and a shared weather watch.', pic.hike5, 'Snow & Ice'),
      sampleClub('sample-powder-collective', 'Powder Collective', 'Snowboarding', 'Find fresh lines and a friendly crew for every kind of winter day.', pic.ridge, 'Snow & Ice'),
    ],
  },
  {
    id: 'alternative-sports',
    name: 'Alternative Sports',
    clubs: [
      sampleClub('sample-urban-motion', 'Urban Motion', 'Parkour', 'Move through the city with control, creativity, and a supportive practice crew.', pic.run, 'Alternative Sports'),
      sampleClub('sample-roller-republic', 'Roller Republic', 'Roller Skating', 'Street lines, rink nights, and a place to keep your wheels moving.', pic.cycle, 'Alternative Sports'),
      sampleClub('sample-chain-seekers', 'Chain Seekers', 'Disc Golf', 'New courses, better throws, and low-key rounds with good company.', pic.volley, 'Alternative Sports'),
    ],
  },
  {
    id: 'outdoor-explorers',
    name: 'Outdoor Explorers',
    clubs: [
      sampleClub('sample-rapid-society', 'Rapid Society', 'Whitewater Kayaking', 'Learn the river, sharpen your lines, and build confidence in moving water.', pic.canoe, 'Outdoor Explorers'),
      sampleClub('sample-iron-path-crew', 'Iron Path Crew', 'Via Ferrata', 'Cables, exposure, and a steady crew for the next route above the valley.', pic.climb2, 'Outdoor Explorers'),
      sampleClub('sample-wake-district', 'Wake District', 'Wakeboarding', 'Progression sessions, smooth water, and a crew that celebrates every new trick.', pic.kayak2, 'Outdoor Explorers'),
    ],
  },
]

export function selectRandomSampleClubGroup(previousGroupId?: string): SampleClubGroup {
  const eligibleGroups = sampleClubGroups.length > 1 && previousGroupId
    ? sampleClubGroups.filter((group) => group.id !== previousGroupId)
    : sampleClubGroups
  return eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)] ?? sampleClubGroups[0]
}
