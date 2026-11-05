import { useState } from 'react'
import { AddToSchedule } from './AddToSchedule'
import { Icon } from './Icon'
import { driveMinutes, formatDuration, needsFlight, type Trip } from './trips'
import { Header } from './ui'

interface ScheduleScreenProps {
  items: Trip[]
  joined: string[]
  reserved: string[]
  openTrip: (id: string) => void
  addTrip: (trip: Trip) => void
}

const week = [
  { d: 'MON', n: '17' },
  { d: 'TUE', n: '18' },
  { d: 'WED', n: '19' },
  { d: 'THU', n: '20' },
  { d: 'FRI', n: '21' },
  { d: 'SAT', n: '22' },
  { d: 'SUN', n: '23' },
]

const calendarDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
type ScheduleView = 'week' | 'month' | 'day'

function dateName(day: number) {
  return new Date(2026, 9, day).toLocaleDateString([], { weekday: 'long' })
}

function occursOnDay(trip: Trip, day: number) {
  if (trip.dateLabel.includes('October')) return Number(trip.shortDate) === day
  return trip.dayIndex !== undefined && trip.dayIndex + 17 === day
}

function TravelChip({ trip }: { trip: Trip }) {
  if (trip.personal) return null
  const flight = needsFlight(trip)
  return (
    <span className={`travel-chip ${flight ? 'flight' : ''}`}>
      <Icon name={flight ? 'plane' : 'car'} size={13} />
      {flight ? `${trip.miles.toLocaleString()} mi · Flight` : `${formatDuration(driveMinutes(trip.miles))} drive`}
    </span>
  )
}

function TripRow({ trip, booked, open }: { trip: Trip; booked: boolean; open: () => void }) {
  return (
    <button className="schedule-event" onClick={open}>
      <div className={`schedule-date ${trip.tone}`}>
        <span>{trip.shortDay}</span>
        <strong>{trip.shortDate}</strong>
      </div>
      <div className="schedule-copy">
        <div className="schedule-meta">
          <span>{trip.time.split(' – ')[0]}</span>
          {!trip.personal && <span>{trip.slots}/{trip.capacity} slots</span>}
          {booked && <span className="booked-flag"><Icon name="check" size={11} /> Booked</span>}
        </div>
        <h3>{trip.title}</h3>
        <p><span className="tiny-mark">{trip.club[0]}</span>{trip.club}</p>
        <div className="schedule-chips">
          {trip.weather && <span className="weather-chip">{trip.weather}</span>}
          {trip.personal && <span className="weather-chip">Personal</span>}
          <TravelChip trip={trip} />
        </div>
      </div>
      <Icon name="chevron" size={18} />
    </button>
  )
}

export function ScheduleScreen({ items = [], joined = [], reserved = [], openTrip, addTrip }: ScheduleScreenProps) {
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<ScheduleView>('week')
  const [selectedDay, setSelectedDay] = useState(20)
  const [myClubsOnly, setMyClubsOnly] = useState(false)
  const keep = (trip: Trip) => !myClubsOnly || trip.clubId === 'club-0'
  const dayTrips = items.filter((trip) => occursOnDay(trip, selectedDay) && keep(trip))
  const later = items.filter((trip) => trip.dayIndex === undefined && keep(trip))

  const changeView = (next: ScheduleView) => {
    if (next === 'week' && (selectedDay < 17 || selectedDay > 23)) setSelectedDay(20)
    setView(next)
  }

  const moveDay = (amount: number) => {
    setSelectedDay((day) => Math.min(31, Math.max(1, day + amount)))
  }

  return (
    <div className="screen">
      <Header eyebrow="October 2026" title="Your schedule" />

      <div className="schedule-view-toggle" role="tablist" aria-label="Schedule view">
        <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'active' : ''} onClick={() => changeView('week')}>
          <Icon name="schedule" size={17} /> Week
        </button>
        <button role="tab" aria-selected={view === 'month'} className={view === 'month' ? 'active' : ''} onClick={() => changeView('month')}>
          <Icon name="calendar" size={17} /> Month
        </button>
        <button role="tab" aria-selected={view === 'day'} className={view === 'day' ? 'active' : ''} onClick={() => changeView('day')}>
          <Icon name="clock" size={17} /> Day
        </button>
      </div>

      {view === 'week' && (
        <div className="week-strip">
          {week.map((day, index) => (
            <button key={day.d} className={selectedDay === index + 17 ? 'selected' : ''} onClick={() => setSelectedDay(index + 17)}>
              <span>{day.d}</span>
              <strong>{day.n}</strong>
              {items.some((trip) => trip.dayIndex === index) && <i />}
            </button>
          ))}
        </div>
      )}

      {view === 'month' && (
        <section className="month-calendar">
          <header>
            <h2>October 2026</h2>
            <span>{items.filter((trip) => trip.dateLabel.includes('October')).length} events</span>
          </header>
          <div className="month-weekdays">
            {calendarDays.map((day) => <span key={day}>{day[0]}</span>)}
          </div>
          <div className="month-grid">
            {Array.from({ length: 4 }, (_, index) => <span className="month-blank" key={`blank-${index}`} />)}
            {Array.from({ length: 31 }, (_, index) => {
              const day = index + 1
              const count = items.filter((trip) => occursOnDay(trip, day)).length
              return (
                <button key={day} className={`${selectedDay === day ? 'selected' : ''} ${count ? 'has-events' : ''}`} onClick={() => setSelectedDay(day)}>
                  <strong>{day}</strong>
                  {count > 0 && (
                    <span>{Array.from({ length: Math.min(count, 3) }, (_, dot) => <i key={dot} />)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {view === 'day' && (
        <div className="day-navigator">
          <button onClick={() => moveDay(-1)} disabled={selectedDay === 1} aria-label="Previous day"><Icon name="back" size={19} /></button>
          <div>
            <span className="kicker">{dateName(selectedDay)}</span>
            <strong>October {selectedDay}</strong>
          </div>
          <button onClick={() => moveDay(1)} disabled={selectedDay === 31} aria-label="Next day"><Icon name="arrow" size={19} /></button>
        </div>
      )}

      <div className="schedule-head">
        <span>{dateName(selectedDay)}, {view === 'month' ? 'October' : 'Oct'} {selectedDay}</span>
        <label className="my-clubs-toggle">
          <input type="checkbox" checked={myClubsOnly} onChange={(event) => setMyClubsOnly(event.target.checked)} />
          <span /> My clubs only
        </label>
      </div>

      <button className="add-schedule" onClick={() => setAdding(true)}>
        <span><Icon name="plus" size={18} /></span>
        <div><strong>Add to schedule</strong><small>Events from your clubs, or your own plans</small></div>
        <Icon name="chevron" size={18} />
      </button>

      <div className={`schedule-list ${view === 'day' ? 'day-list' : ''}`}>
        {dayTrips.map((trip) => (
          <div className={view === 'day' ? 'day-event-row' : ''} key={trip.id}>
            {view === 'day' && <time>{trip.time.split(' – ')[0]}</time>}
            <TripRow trip={trip} booked={reserved.includes(trip.id)} open={() => openTrip(trip.id)} />
          </div>
        ))}
        {dayTrips.length === 0 && (
          <div className="schedule-note">
            <Icon name="spark" size={18} />
            <p><strong>Nothing planned for {dateName(selectedDay)}.</strong><br />Tap Add to schedule to fill it.</p>
          </div>
        )}
      </div>

      {view === 'week' && later.length > 0 && (
        <section className="later-trips">
          <div className="section-title compact"><div><span className="kicker">Further out</span><h2>Upcoming trips</h2></div></div>
          <div className="schedule-list">
            {later.map((trip) => <TripRow key={trip.id} trip={trip} booked={reserved.includes(trip.id)} open={() => openTrip(trip.id)} />)}
          </div>
        </section>
      )}

      {adding && (
        <AddToSchedule
          joined={joined}
          scheduledIds={items.map((trip) => trip.id)}
          defaultDate={`2026-10-${String(selectedDay).padStart(2, '0')}`}
          add={addTrip}
          close={() => setAdding(false)}
        />
      )}
    </div>
  )
}