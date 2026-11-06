import { describe, expect, it } from '@jest/globals'
import { activityCatalog } from './activityCatalog'
import { activityIdeasForAnyLocation, activityIdeasForCountry, nearbyPlacesQuery, parseNearbyPlaces, parsePostalLocation } from './nearbyPlaces'

describe('global nearby activity discovery', () => {
  it('resolves US and international postal codes', () => {
    expect(parsePostalLocation({
      places: [{ 'place name': 'Beverly Hills', 'state abbreviation': 'CA', 'country abbreviation': 'US', latitude: '34.09', longitude: '-118.40' }],
    })).toEqual({ city: 'Beverly Hills', region: 'CA', country: 'US', latitude: 34.09, longitude: -118.4 })
    expect(parsePostalLocation({
      places: [{ 'place name': 'London', state: 'England', 'country abbreviation': 'GB', latitude: '51.50', longitude: '-0.12' }],
    })?.country).toBe('GB')
  })

  it('turns nearby map features into distance-sorted activity spots and ideas', () => {
    const places = parseNearbyPlaces({
      elements: [
        { type: 'node', id: 2, lat: 34.1, lon: -118.3, tags: { name: 'Local Gym', leisure: 'fitness_centre' } },
        { type: 'way', id: 1, center: { lat: 34.01, lon: -118.3 }, tags: { name: 'Neighborhood Park', leisure: 'park' } },
        { type: 'node', id: 3, lat: 34.1, lon: -118.3, tags: { leisure: 'park' } },
      ],
    }, { latitude: 34.05, longitude: -118.3 })

    expect(places.map((place) => place.name)).toEqual(['Neighborhood Park', 'Local Gym'])
    expect(places[0].activities).toContain('Outdoor yoga')
    expect(places[1].activities).toContain('Kickboxing')
    expect(activityIdeasForAnyLocation).toContain('Pilates')
  })

  it('offers the requested activities in the activity tracker', () => {
    const names = activityCatalog.map((activity) => activity.name)
    expect(names).toContain('Outdoor Yoga')
    expect(names).toContain('Kickboxing')
    expect(names).toContain('Reformer Pilates')
  })

  it('always offers two activity ideas for US ZIP-code searches', () => {
    expect(activityIdeasForCountry('US')).toEqual([
      'Walking or jogging on public paths',
      'Outdoor bodyweight workout',
    ])
    expect(activityIdeasForCountry('CA')).toEqual(activityIdeasForAnyLocation)
    expect(activityIdeasForCountry('GB')).toEqual(activityIdeasForAnyLocation)
  })

  it('queries worldwide activity features around the searched coordinates', () => {
    const query = nearbyPlacesQuery({ latitude: 51.5, longitude: -0.12 })
    expect(query).toContain('around:15000,51.5,-0.12')
    expect(query).toContain('"natural"')
  })
})
