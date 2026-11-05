import { useState, type FormEvent } from 'react'
import { clubById } from './data'
import { Icon } from './Icon'
import { clubEventTrip, createPersonalEvent, trips, type Trip } from './trips'

interface AddToScheduleProps {
  joined: string[]
  scheduledIds: string[]
  defaultDate: string
  add: (trip: Trip) => void
  close: () => void
}

type Tab = 'browse' | 'custom'

function Candidate({ trip, onAdd }: { trip: Trip; onAdd: () => void }) {
  return (
    <div className="candidate">
      <div className={`schedule-date ${trip.tone}`}><span>{trip.shortDay}</span><strong>{trip.shortDate}</strong></div>
      <div className="candidate-main">
        <strong>{trip.title}</strong>
        <span>{trip.club} · {trip.time.split(' – ')[0]}</span>
        <span>{trip.location}</span>
      </div>
      <button onClick={onAdd} aria-label={`Add ${trip.title} to schedule`}><Icon name="plus" size={18} /></button>
    </div>
  )
}

export function AddToSchedule({ joined, scheduledIds, defaultDate, add, close }: AddToScheduleProps) {
  const [tab, setTab] = useState<Tab>('browse')
  const [form, setForm] = useState({ title: '', date: defaultDate, time: '', location: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const clubTrips = joined
    .map((id) => clubById(id))
    .filter(Boolean)
    .map((c) => clubEventTrip(c, c.nextEvent, c.nextWhen, c.spots, 0))
  const fromClubs = clubTrips.filter((t) => !scheduledIds.includes(t.id))
  const popular = trips.filter((t) => !scheduledIds.includes(t.id) && !clubTrips.some((c) => c.id === t.id))
  const nothingLeft = fromClubs.length === 0 && popular.length === 0

  const pick = (t: Trip) => {
    add(t)
    setJustAdded(t.title)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Give your event a name'
    if (!form.date) next.date = 'Pick a date'
    setErrors(next)
    if (Object.keys(next).length) return
    add(createPersonalEvent({ ...form, title: form.title.trim() }))
    close()
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="event-sheet add-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-content">
          <div className="sheet-handle" />
          <button className="sheet-close" onClick={close} aria-label="Close"><Icon name="close" /></button>
          <span className="kicker">Build your week</span>
          <h2 className="plan-title">Add to schedule</h2>

          <div className="mode-toggle" role="tablist">
            <button role="tab" aria-selected={tab === 'browse'} className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}><Icon name="search" size={16} /> Browse events</button>
            <button role="tab" aria-selected={tab === 'custom'} className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}><Icon name="plus" size={16} /> Create your own</button>
          </div>

          {justAdded && <div className="added-toast" role="status"><Icon name="check" size={16} /> Added {justAdded}</div>}

          {tab === 'browse' ? (
            <div className="candidate-groups">
              {fromClubs.length > 0 && (
                <div>
                  <h4 className="fare-heading">From your clubs</h4>
                  {fromClubs.map((t) => <Candidate key={t.id} trip={t} onAdd={() => pick(t)} />)}
                </div>
              )}
              {popular.length > 0 && (
                <div>
                  <h4 className="fare-heading">Popular near you</h4>
                  {popular.map((t) => <Candidate key={t.id} trip={t} onAdd={() => pick(t)} />)}
                </div>
              )}
              {nothingLeft && <div className="empty-state"><Icon name="check" size={26} /><p><strong>Everything is on your schedule.</strong><br />Join more clubs or create your own event.</p></div>}
            </div>
          ) : (
            <form className="fields" onSubmit={submit} noValidate>
              <label className={`field ${errors.title ? 'invalid' : ''}`}>
                <span>Event name</span>
                <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Morning run with Sam" />
                {errors.title && <em>{errors.title}</em>}
              </label>
              <div className="field-row">
                <label className={`field ${errors.date ? 'invalid' : ''}`}>
                  <span>Date</span>
                  <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                  {errors.date && <em>{errors.date}</em>}
                </label>
                <label className="field"><span>Time</span><input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} /></label>
              </div>
              <label className="field"><span>Location</span><input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Griffith Park" /></label>
              <label className="field"><span>Notes (optional)</span><input value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Bring water" /></label>
              <button className="reserve-button" type="submit"><Icon name="check" /> Add to my schedule</button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}