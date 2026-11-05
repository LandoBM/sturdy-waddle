export type NearbyKind = 'Eat' | 'Stay' | 'See' | 'Gear'

export interface NearbyItem {
  kind: NearbyKind
  name: string
  note: string
  distance: string
}

export interface NearbyArea {
  area: string
  items: NearbyItem[]
}

// Hand-picked demo suggestions per trip destination.
export const nearby: Record<string, NearbyArea> = {
  t1: { area: 'Los Feliz', items: [
    { kind: 'Eat', name: 'Post-run coffee in Los Feliz', note: 'Patio cafes a few minutes from the trailhead', distance: '1.2 mi' },
    { kind: 'See', name: 'Lake Hollywood Park', note: 'Skyline view of the Hollywood Sign', distance: '0.5 mi' },
    { kind: 'Gear', name: 'Running store on Hillhurst', note: 'Shoe fitting and trail gear', distance: '2.0 mi' },
  ] },
  t2: { area: 'Echo Park', items: [
    { kind: 'See', name: 'Echo Park Lake lotus beds', note: 'Best in the evening light', distance: '0.1 mi' },
    { kind: 'Eat', name: 'Taco stands on Sunset Blvd', note: 'Easy dinner after class', distance: '0.4 mi' },
    { kind: 'Gear', name: 'Mat and block rentals', note: 'Ask the club host to bring spares', distance: 'On site' },
  ] },
  t3: { area: 'Griffith Park', items: [
    { kind: 'See', name: 'Griffith Observatory', note: 'Sunset views over the city', distance: '1.1 mi' },
    { kind: 'Eat', name: 'Los Feliz dinner spots', note: 'Casual places that fit a group', distance: '2.3 mi' },
    { kind: 'Gear', name: 'Bring layers and a headlamp', note: 'It cools quickly after golden hour', distance: 'Packing tip' },
  ] },
  t4: { area: 'Eagle Rock', items: [
    { kind: 'Eat', name: 'Eagle Rock Blvd breakfast', note: 'Bakeries open early for hikers', distance: '0.8 mi' },
    { kind: 'See', name: 'Eagle Rock Park', note: 'Short loop with a view of the rock', distance: '0.3 mi' },
    { kind: 'Gear', name: 'Sunrise light and layers', note: 'Starts cold, ends warm', distance: 'Packing tip' },
  ] },
  t5: { area: 'Joshua Tree', items: [
    { kind: 'See', name: 'Keys View', note: 'Panoramic overlook of the Coachella Valley', distance: '18 mi' },
    { kind: 'See', name: 'Hidden Valley Nature Trail', note: 'Easy 1 mile loop through boulders', distance: '0.4 mi' },
    { kind: 'Stay', name: 'Joshua Tree village lodging', note: 'Cabins and cozy inns close to the park gate', distance: '5 mi' },
    { kind: 'Eat', name: 'Joshua Tree village cafes', note: 'Good coffee and big breakfasts before climbing', distance: '5 mi' },
    { kind: 'Gear', name: 'Crash pad and shoe rental', note: 'Local shops rent pads by the day', distance: '6 mi' },
  ] },
  t6: { area: 'Denali and Anchorage', items: [
    { kind: 'See', name: 'Savage River Loop', note: 'Easy warm-up walk in the park', distance: '15 mi' },
    { kind: 'See', name: 'Anchorage Museum', note: 'A good layover stop on arrival day', distance: '4 mi from ANC' },
    { kind: 'Stay', name: 'Healy and Park Village lodging', note: 'Closest beds to the park entrance', distance: '11 mi' },
    { kind: 'Eat', name: 'Healy diners', note: 'Hearty meals before heading into the backcountry', distance: '11 mi' },
    { kind: 'Gear', name: 'Bear canister rental', note: 'Required for backcountry camping', distance: 'Visitor center' },
  ] },
  t7: { area: 'Springdale and Zion', items: [
    { kind: 'See', name: 'Riverside Walk', note: 'Paved path to the start of the Narrows', distance: '8 mi' },
    { kind: 'Stay', name: 'Springdale lodging', note: 'Walk to the park shuttle', distance: '1 mi' },
    { kind: 'Eat', name: 'Springdale cafes', note: 'Plenty of options for a big pre-hike breakfast', distance: '1 mi' },
    { kind: 'Gear', name: 'Neoprene sock and boot rental', note: 'Cold water gear for the Narrows', distance: '1 mi' },
  ] },
}
