import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from './Icon'
import { nearby, type NearbyKind } from './nearby'
import type { Trip } from './trips'

export type PlanKind = 'flight' | 'stay' | 'ride'

export interface Plan {
  id: string
  tripId: string
  kind: PlanKind
  provider: string
  reference: string
  date: string
  endDate: string
  from: string
  to: string
  flightNo: string
  depart: string
  arrive: string
  notes: string
}

const kinds: { id: PlanKind; label: string; icon: IconName }[] = [
  { id: 'flight', label: 'Flight', icon: 'plane' },
  { id: 'stay', label: 'Stay', icon: 'home' },
  { id: 'ride', label: 'Ride', icon: 'car' },
]

const providerLabel: Record<PlanKind, string> = { flight: 'Airline', stay: 'Hotel or rental', ride: 'Car, train or shuttle' }

const empty = (tripId: string): Plan => ({
  id: '', tripId, kind: 'flight', provider: '', reference: '', date: '', endDate: '', from: '', to: '', flightNo: '', depart: '', arrive: '', notes: '',
})

const fmtDate = (iso: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const fmtTime = (t: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

interface PlanSheetProps {
  trip: Trip
  initialKind: PlanKind
  save: (plan: Plan) => void
  close: () => void
}

export function PlanSheet({ trip, initialKind, save, close }: PlanSheetProps) {
  const [plan, setPlan] = useState<Plan>({ ...empty(trip.id), kind: initialKind, to: initialKind === 'flight' ? trip.airport?.code ?? '' : '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<Plan>) => setPlan((p) => ({ ...p, ...patch }))

  const choose = (kind: PlanKind) => set({ kind, to: kind === 'flight' && !plan.to ? trip.airport?.code ?? '' : plan.to })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!plan.provider.trim()) next.provider = `Enter the ${providerLabel[plan.kind].toLowerCase()}`
    if (!/^[A-Z0-9]{5,10}$/.test(plan.reference)) next.reference = 'Use 5 to 10 letters or numbers'
    if (!plan.date) next.date = plan.kind === 'stay' ? 'Add a check-in date' : 'Add a date'
    if (plan.kind === 'flight') {
      if (!/^[A-Za-z]{3}$/.test(plan.from)) next.from = '3-letter code'
      if (!/^[A-Za-z]{3}$/.test(plan.to)) next.to = '3-letter code'
    }
    setErrors(next)
    if (Object.keys(next).length) return
    save({ ...plan, id: `plan-${Date.now()}`, from: plan.from.toUpperCase(), to: plan.to.toUpperCase() })
  }

  const field = (id: keyof Plan, label: string, props: { type?: string; placeholder?: string; upper?: boolean; maxLength?: number } = {}) => (
    <label className={`field ${errors[id] ? 'invalid' : ''}`}>
      <span>{label}</span>
      <input
        type={props.type ?? 'text'}
        value={plan[id]}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        onChange={(e) => set({ [id]: props.upper ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value } as Partial<Plan>)}
      />
      {errors[id] && <em>{errors[id]}</em>}
    </label>
  )

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form className="event-sheet plan-sheet" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="sheet-content">
          <div className="sheet-handle" />
          <button type="button" className="sheet-close" onClick={close} aria-label="Close"><Icon name="close" /></button>
          <span className="kicker">Already booked?</span>
          <h2 className="plan-title">Add your travel</h2>
          <p className="plan-sub">for {trip.title}</p>

          <div className="mode-toggle" role="tablist">
            {kinds.map((k) => (
              <button key={k.id} type="button" role="tab" aria-selected={plan.kind === k.id} className={plan.kind === k.id ? 'active' : ''} onClick={() => choose(k.id)}>
                <Icon name={k.icon} size={16} /> {k.label}
              </button>
            ))}
          </div>

          <div className="fields">
            {field('provider', providerLabel[plan.kind], { placeholder: plan.kind === 'flight' ? 'Delta' : plan.kind === 'stay' ? 'Desert Inn' : 'Shuttle service' })}
            {field('reference', 'Confirmation code', { placeholder: 'HJKK8L', upper: true, maxLength: 10 })}
            {plan.kind === 'flight' && (
              <>
                {field('flightNo', 'Flight number', { placeholder: 'DL 1457' })}
                <div className="field-row">
                  {field('from', 'From', { placeholder: 'LAX', maxLength: 3 })}
                  {field('to', 'To', { placeholder: trip.airport?.code ?? 'ANC', maxLength: 3 })}
                </div>
                {field('date', 'Date', { type: 'date' })}
                <div className="field-row">
                  {field('depart', 'Departs', { type: 'time' })}
                  {field('arrive', 'Arrives', { type: 'time' })}
                </div>
              </>
            )}
            {plan.kind === 'stay' && (
              <div className="field-row">
                {field('date', 'Check in', { type: 'date' })}
                {field('endDate', 'Check out', { type: 'date' })}
              </div>
            )}
            {plan.kind === 'ride' && field('date', 'Date', { type: 'date' })}
            {plan.kind !== 'flight' && field('notes', 'Notes (optional)', { placeholder: plan.kind === 'stay' ? 'Address, check in code' : 'Pickup spot, time' })}
          </div>

          <button className="reserve-button" type="submit"><Icon name="check" /> Save travel plan</button>
        </div>
      </form>
    </div>
  )
}

interface PlansSectionProps {
  trip: Trip
  plans: Plan[]
  add: (kind: PlanKind) => void
  remove: (id: string) => void
}

export function PlansSection({ trip, plans, add, remove }: PlansSectionProps) {
  return (
    <section className="plans-section">
      <div className="section-title compact">
        <div><span className="kicker">Already have plans?</span><h2>Your travel</h2></div>
      </div>
      {plans.map((p) => {
        const icon = kinds.find((k) => k.id === p.kind)!.icon
        return (
          <article key={p.id} className={`plan-card ${p.kind}`}>
            <div className="plan-icon"><Icon name={icon} size={20} /></div>
            <div className="plan-main">
              {p.kind === 'flight' ? (
                <>
                  <strong>{p.provider} {p.flightNo}</strong>
                  <span className="plan-route">{p.from} <Icon name="arrow" size={14} /> {p.to}</span>
                  <span>{fmtDate(p.date)}{p.depart && ` · ${fmtTime(p.depart)}`}{p.arrive && ` to ${fmtTime(p.arrive)}`}</span>
                  {trip.airport && p.to === trip.airport.code && <em className="plan-match"><Icon name="check" size={11} /> Lands at the nearest airport</em>}
                </>
              ) : (
                <>
                  <strong>{p.provider}</strong>
                  <span>{fmtDate(p.date)}{p.endDate && ` to ${fmtDate(p.endDate)}`}</span>
                  {p.notes && <span>{p.notes}</span>}
                </>
              )}
              <div className="plan-ref"><span>Confirmation</span><b>{p.reference}</b></div>
            </div>
            <button onClick={() => remove(p.id)} aria-label={`Remove ${p.provider}`}><Icon name="close" size={16} /></button>
          </article>
        )
      })}
      <div className="plan-add">
        {kinds.map((k) => (
          <button key={k.id} onClick={() => add(k.id)}><Icon name="plus" size={15} /> {k.label}</button>
        ))}
      </div>
    </section>
  )
}

const kindIcon: Record<NearbyKind, IconName> = { Eat: 'heart', Stay: 'home', See: 'pin', Gear: 'bookmark' }

export function NearbySection({ trip }: { trip: Trip }) {
  const data = nearby[trip.id]
  const [filter, setFilter] = useState<'All' | NearbyKind>('All')
  if (!data) return null
  const kindsPresent: ('All' | NearbyKind)[] = ['All', ...Array.from(new Set(data.items.map((i) => i.kind)))]
  const items = data.items.filter((i) => filter === 'All' || i.kind === filter)
  return (
    <section className="nearby-section">
      <div className="section-title compact"><div><span className="kicker">Make the most of the trip</span><h2>Around {data.area}</h2></div></div>
      <div className="chip-row">
        {kindsPresent.map((k) => <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{k}</button>)}
      </div>
      <div className="nearby-list">
        {items.map((i) => (
          <a key={i.name} className="nearby-item" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${i.name} ${data.area}`)}`} target="_blank" rel="noreferrer">
            <span className={`nearby-icon ${i.kind}`}><Icon name={kindIcon[i.kind]} size={18} /></span>
            <div><strong>{i.name}</strong><span>{i.note}</span></div>
            <small>{i.distance}</small>
          </a>
        ))}
      </div>
    </section>
  )
}
