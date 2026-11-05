import { useState } from 'react'
import { clubById } from './data'
import { Icon } from './Icon'
import { useMessages } from './messages'
import { NearbySection, PlanSheet, PlansSection, type Plan, type PlanKind } from './Plans'
import {
  FLIGHT_THRESHOLD_MILES, HOME, PASSENGER, cheapestOption, driveMinutes, formatClock, formatDuration, leaveBy, needsFlight, qrCells, scheduleUrl, sortedOptions,
  type Flight, type Trip,
} from './trips'

interface EventSheetProps {
  trip: Trip
  reserved: boolean
  toggleReserve: () => void
  viewBooking: () => void
  removeFromSchedule: () => void
  close: () => void
}

export function EventSheet({ trip, reserved, toggleReserve, viewBooking, removeFromSchedule, close }: EventSheetProps) {
  const flight = needsFlight(trip)
  const drive = formatDuration(driveMinutes(trip.miles))
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="event-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-image">
          <img src={trip.image} alt={trip.title} />
          <button onClick={close} aria-label="Close"><Icon name="close" /></button>
          <span className="tag white">{trip.category.toUpperCase()}</span>
        </div>
        <div className="sheet-content">
          <div className="sheet-handle" />
          <span className="kicker">{trip.dateLabel}</span>
          <h2>{trip.title}</h2>
          <div className="detail-rows">
            <div><Icon name="clock" /><p><strong>{trip.time}</strong><span>Arrive 15 minutes early</span></p></div>
            <div><Icon name="map" /><p><strong>{trip.location}</strong><span>{trip.locationNote}</span></p></div>
            {!trip.personal && <div><Icon name="users" /><p><strong>{trip.capacity - trip.slots} people are going</strong><span>{trip.slots} spots still available</span></p></div>}
            {!trip.personal && <div className={flight ? 'travel-preview flight' : 'travel-preview'}>
              <Icon name={flight ? 'plane' : 'car'} />
              <p>
                <strong>{trip.miles.toLocaleString()} miles from {HOME.city}</strong>
                <span>{flight ? `Over ${FLIGHT_THRESHOLD_MILES} miles: flights and a ${drive} drive option` : trip.miles > FLIGHT_THRESHOLD_MILES ? `Over ${FLIGHT_THRESHOLD_MILES} miles: flying is likely the best option` : `About ${drive} by car`}</span>
              </p>
            </div>}
            {flight && trip.airport && (
              <a className="sheet-fare" href={cheapestOption(trip).url} target="_blank" rel="noreferrer">
                <Icon name="plane" />
                <p>
                  <strong>Cheapest flight to {trip.airport.code}: ${cheapestOption(trip).price}</strong>
                  <span>{cheapestOption(trip).airline} · round trip est.</span>
                </p>
                <Icon name="external" size={18} />
              </a>
            )}
          </div>
          {trip.personal ? (
            <div className="sheet-actions"><button className="text-danger" onClick={removeFromSchedule}>Remove from schedule</button></div>
          ) : reserved ? (
            <div className="sheet-actions">
              <button className="reserve-button" onClick={viewBooking}>View booking details <Icon name="arrow" /></button>
              <button className="text-danger" onClick={toggleReserve}>Cancel reservation</button>
              <button className="text-danger muted" onClick={removeFromSchedule}>Remove from schedule</button>
            </div>
          ) : (
            <div className="sheet-actions">
              <button className="reserve-button" onClick={toggleReserve}>Reserve my spot <Icon name="arrow" /></button>
              <button className="text-danger" onClick={removeFromSchedule}>Remove from schedule</button>
            </div>
          )}
          {!trip.personal && <p className="fine-print">Free event · Cancel anytime up to 2 hours before</p>}
        </div>
      </section>
    </div>
  )
}

function QrCode({ seed }: { seed: string }) {
  const cells = qrCells(seed)
  return (
    <svg className="qr" viewBox={`0 0 ${cells.length} ${cells.length}`} role="img" aria-label={`QR code for confirmation ${seed}`} shapeRendering="crispEdges">
      {cells.map((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  )
}

function BoardingPass({ flight }: { flight: Flight }) {
  return (
    <div className="flight-block">
      <div className="flight-ref">
        <div><span>Confirmation</span><strong>{flight.confirmation}</strong></div>
        <div><span>Airline</span><strong>{flight.airline}</strong></div>
      </div>
      <article className={`boarding-pass ${flight.direction === 'Return' ? 'return' : ''}`}>
        <header>
          <span className="pass-label"><Icon name="plane" size={14} /> {flight.direction === 'Going' ? 'Going' : 'Return'} · Boarding pass</span>
          <span>{flight.date}</span>
        </header>
        <div className="route">
          <div><strong>{flight.from}</strong><span>{flight.fromCity}</span><b>{flight.depart}</b></div>
          <div className="route-line"><i /><Icon name="plane" size={20} /><i /><small>{flight.duration}</small></div>
          <div><strong>{flight.to}</strong><span>{flight.toCity}</span><b>{flight.arrive}</b></div>
        </div>
        <div className="pass-body">
          <div className="pass-fields">
            <div><span>Passenger</span><strong>{PASSENGER}</strong></div>
            <div><span>Flight</span><strong>{flight.flightNo}</strong></div>
            <div><span>Gate</span><strong>{flight.gate}</strong></div>
            <div><span>Seat</span><strong>{flight.seat}</strong></div>
            <div><span>Boards</span><strong>{flight.boarding}</strong></div>
          </div>
          <QrCode seed={flight.confirmation + flight.flightNo} />
        </div>
      </article>
    </div>
  )
}


function FlyPlan({ trip, onAdd }: { trip: Trip; onAdd: () => void }) {
  const airport = trip.airport!
  const options = sortedOptions(trip)
  const best = options[0]
  return (
    <div className="fly-plan">
      <div className="airport-card">
        <div className="airport-code">{airport.code}</div>
        <div>
          <span className="kicker">Nearest airport to the venue</span>
          <strong>{airport.name}</strong>
          {trip.groundAfter && <p>{trip.groundAfter.miles} mi · {formatDuration(trip.groundAfter.minutes)} drive to the venue</p>}
        </div>
      </div>
      <a className="schedule-link" href={scheduleUrl(trip)} target="_blank" rel="noreferrer">
        <Icon name="schedule" size={18} /> See LAX to {airport.code} flight schedules <Icon name="external" size={16} />
      </a>

      <a className="best-fare" href={best.url} target="_blank" rel="noreferrer">
        <span className="fare-flag">Suggested · Cheapest</span>
        <div className="best-fare-row">
          <div><strong>${best.price}</strong><small>round trip, est.</small></div>
          <div className="best-fare-info"><b>{best.airline}</b><span>{best.flightNo} · {best.depart} to {best.arrive}</span><span>{best.stops} · {best.duration}</span></div>
        </div>
        <span className="best-fare-cta">Book with {best.airline} <Icon name="external" size={16} /></span>
      </a>

      <h4 className="fare-heading">All flights to {airport.code}</h4>
      <div className="fare-list">
        {options.map((o, i) => (
          <a key={o.flightNo} className={`fare-card ${i === 0 ? 'cheapest' : ''}`} href={o.url} target="_blank" rel="noreferrer">
            <div className="fare-main">
              <strong>{o.airline}</strong>
              <span>{o.flightNo} · {o.stops}</span>
              <span>{o.depart} to {o.arrive} · {o.duration}</span>
            </div>
            <div className="fare-price"><strong>${o.price}</strong><Icon name="external" size={15} /></div>
          </a>
        ))}
      </div>
      <p className="fine-print left">Fares are estimates for the round trip. Tapping a flight opens that airline's site to see live prices and book.</p>

      {trip.flights && (
        <div className="booked-flights">
          <h4 className="fare-heading">Your booked flights</h4>
          {trip.flights.map((f) => <BoardingPass key={f.direction} flight={f} />)}
        </div>
      )}
      <button className="already-booked" onClick={onAdd}><Icon name="plus" size={16} /> I already have a flight, add it</button>
    </div>
  )
}

type Mode = 'fly' | 'drive'

function TravelSection({ trip, onAdd }: { trip: Trip; onAdd: () => void }) {
  const flight = needsFlight(trip)
  const [mode, setMode] = useState<Mode>(trip.miles >= 300 ? 'fly' : 'drive')
  const minutes = driveMinutes(trip.miles)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${HOME.city} ${HOME.zip}`)}&destination=${encodeURIComponent(trip.location)}`

  const drive = (
    <div className="drive-card">
      <div className="drive-main">
        <Icon name="car" size={26} />
        <div><strong>{formatDuration(minutes)}</strong><span>{Math.round(trip.miles * 1.15).toLocaleString()} road miles from {HOME.city}</span></div>
      </div>
      {trip.miles >= 1200 ? (
        <p className="drive-note warn">That is a multi-day drive, so flying is recommended for this trip.</p>
      ) : (
        <div className="leave-row"><span>Leave by</span><strong>{formatClock(trip.startMin - minutes - 15)}</strong><small>for a {trip.time.split(' – ')[0]} start</small></div>
      )}
      <a className="maps-link" href={mapsUrl} target="_blank" rel="noreferrer">Open directions <Icon name="arrow" size={16} /></a>
    </div>
  )

  return (
    <section className="travel-section">
      <div className="travel-banner">
        <div><span className="kicker">Getting there</span><h3>{trip.miles.toLocaleString()} miles away</h3></div>
        <span className={`distance-pill ${flight ? 'flight' : ''}`}>{flight ? `Over ${FLIGHT_THRESHOLD_MILES} mi` : 'Local'}</span>
      </div>

      {flight ? (
        <>
          <div className="mode-toggle" role="tablist">
            <button role="tab" aria-selected={mode === 'fly'} className={mode === 'fly' ? 'active' : ''} onClick={() => setMode('fly')}><Icon name="plane" size={16} /> Fly</button>
            <button role="tab" aria-selected={mode === 'drive'} className={mode === 'drive' ? 'active' : ''} onClick={() => setMode('drive')}><Icon name="car" size={16} /> Drive</button>
          </div>
          {mode === 'fly' ? <FlyPlan trip={trip} onAdd={onAdd} /> : drive}
        </>
      ) : (
        <>
          {drive}
          {trip.miles > FLIGHT_THRESHOLD_MILES ? (
            <a className="schedule-link" href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from LAX to ${trip.location}`)}`} target="_blank" rel="noreferrer">
              <Icon name="plane" size={18} /> Search flights to {trip.location} <Icon name="external" size={16} />
            </a>
          ) : <div className="ground-leg"><Icon name="check" size={18} /><p><strong>No flight needed</strong><span>This event is within {FLIGHT_THRESHOLD_MILES} miles of home. Public transport may be available.</span></p></div>}
        </>
      )}
    </section>
  )
}

interface BookingPageProps {
  trip: Trip
  plans: Plan[]
  addPlan: (plan: Plan) => void
  removePlan: (id: string) => void
  back: () => void
  cancel: () => void
  openClub: () => void
}

export function BookingPage({ trip, plans, addPlan, removePlan, back, cancel, openClub }: BookingPageProps) {
  const { openChat } = useMessages()
  const [planKind, setPlanKind] = useState<PlanKind | null>(null)
  const [panel, setPanel] = useState<'waiver' | 'policy' | null>(null)
  const [showContact, setShowContact] = useState(false)
  const hostOwner = clubById(trip.clubId).owner
  const toggle = (p: 'waiver' | 'policy') => setPanel(panel === p ? null : p)

  return (
    <div className="booking-page">
      <header className="booking-top">
        <button className="icon-button" onClick={back} aria-label="Back"><Icon name="back" /></button>
        <h1>Booking details</h1>
        <span className="confirmed-pill"><Icon name="check" size={12} /> Confirmed</span>
      </header>

      <div className="booking-body">
        <h2 className="booking-title">{trip.title}</h2>

        <article className="event-details-card">
          <img src={trip.image} alt="" />
          <div className="shade" />
          <div className="event-details-copy">
            <span className="kicker">Event details</span>
            <dl>
              <div><dt>Day</dt><dd>{trip.dateLabel}</dd></div>
              <div><dt>Time</dt><dd>{trip.time}</dd></div>
              <div><dt>Location</dt><dd>{trip.location}</dd></div>
              <div><dt>Objective</dt><dd>{trip.objective}</dd></div>
            </dl>
            <div className="policy-buttons">
              <button className={panel === 'waiver' ? 'active' : ''} onClick={() => toggle('waiver')}><Icon name="file" size={16} /> Waiver</button>
              <button className={panel === 'policy' ? 'active' : ''} onClick={() => toggle('policy')}><Icon name="shield" size={16} /> Policy</button>
            </div>
          </div>
        </article>
        {panel && (
          <div className="policy-panel">
            {panel === 'waiver'
              ? 'By attending you accept the activity risks, confirm you are physically able to take part, and agree to follow the instructions of event leaders. A signed digital waiver is already on file.'
              : 'Free cancellation up to 2 hours before the start. Late cancellations may affect your spot on future events. Bring water, wear suitable shoes, and check the forecast before you travel.'}
          </div>
        )}

        <div className="host-row">
          <button className="host-card" onClick={openClub}><span className="kicker">Club host</span><strong>{trip.club}</strong></button>
          <button className="host-card contact" onClick={() => setShowContact(!showContact)}><Icon name="mail" size={18} /><strong>Club contact</strong></button>
        </div>
        {showContact && <div className="contact-card"><Icon name="mail" size={18} /><div><strong>{trip.club} organizers</strong><span>hello@{trip.club.toLowerCase().replace(/[^a-z]+/g, '')}.club</span></div><button className="mini-message" onClick={() => openChat({ name: hostOwner, role: 'Club owner', subtitle: trip.club })}>Message</button></div>}

        <TravelSection trip={trip} onAdd={() => setPlanKind('flight')} />
        <PlansSection trip={trip} plans={plans} add={setPlanKind} remove={removePlan} />
        <NearbySection trip={trip} />

        <button className="text-danger wide" onClick={cancel}>Cancel reservation</button>
      </div>
      {planKind && (
        <PlanSheet
          trip={trip}
          initialKind={planKind}
          save={(p) => { addPlan(p); setPlanKind(null) }}
          close={() => setPlanKind(null)}
        />
      )}
    </div>
  )
}