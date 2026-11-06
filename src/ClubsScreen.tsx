import { useState, type FormEvent } from 'react'
import { areas, clubById, clubs, distanceFor, type Category, type Club } from './data'
import { Icon } from './Icon'
import { useMessages } from './messages'
import { clubEventTrip, type Trip } from './trips'
import { Header, formatCount } from './ui'

interface ClubsScreenProps {
  joined: string[]
  openClub: (id: string) => void
}

const categories: ('All' | Category)[] = ['All', 'Hiking', 'Climbing', 'Water', 'Cycling', 'Running', 'Wellness', 'Camping', 'Team sports']

// Find the registered area closest to a zip so any valid zip returns something useful.
function nearestZip(zip: string) {
  if (areas[zip]) return zip
  const n = Number(zip)
  return Object.keys(areas).sort((a, b) => Math.abs(Number(a) - n) - Math.abs(Number(b) - n))[0]
}

export function ClubsScreen({ joined, openClub }: ClubsScreenProps) {
  const [input, setInput] = useState('90027')
  const [zip, setZip] = useState('90027')
  const [error, setError] = useState('')
  const [category, setCategory] = useState<'All' | Category>('All')

  const areaZip = nearestZip(zip)
  const area = areas[areaZip]
  const exact = areaZip === zip
  const results = clubs
    .filter((c) => c.zip === areaZip && (category === 'All' || c.category === category))
    .map((c) => ({ club: c, miles: distanceFor(c, zip) }))
    .sort((a, b) => a.miles - b.miles)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{5}$/.test(input)) {
      setError('Enter a 5-digit zip code')
      return
    }
    setError('')
    setZip(input)
    setCategory('All')
  }

  const pick = (z: string) => {
    setInput(z)
    setZip(z)
    setError('')
    setCategory('All')
  }

  return (
    <div className="screen clubs-screen">
      <Header title="Find your people." />

      <form className={`zip-form ${error ? 'has-error' : ''}`} onSubmit={submit}>
        <Icon name="pin" />
        <input
          inputMode="numeric"
          maxLength={5}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          aria-label="Zip code"
          placeholder="Zip code"
        />
        <button type="submit">Search</button>
      </form>
      {error && <p className="zip-error">{error}</p>}

      <div className="chip-row zip-chips">
        {Object.entries(areas).map(([z, a]) => (
          <button key={z} className={zip === z ? 'active' : ''} onClick={() => pick(z)}>
            {a.city} · {z}
          </button>
        ))}
      </div>

      <div className="area-banner">
        <div>
          <strong>{results.length} {results.length === 1 ? 'club' : 'clubs'} in {area.city}, {area.state}</strong>
          <span>{exact ? `Near ${zip}` : `No clubs in ${zip} yet. Showing the closest area.`}</span>
        </div>
      </div>

      <div className="chip-row">
        {categories.map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <div className="club-list">
        {results.map(({ club, miles }) => (
          <button key={club.id} className="club-card" onClick={() => openClub(club.id)}>
            <div className="club-card-image">
              <img src={club.image} alt={`${club.name} members`} loading="lazy" />
              <span className="tag white">{club.category.toUpperCase()}</span>
              {joined.includes(club.id) && <span className="joined-badge"><Icon name="check" size={13} /> Joined</span>}
            </div>
            <div className="club-card-body">
              <div className="club-card-title"><h3>{club.name}</h3><Icon name="chevron" size={18} /></div>
              <p className="club-mission">{club.mission}</p>
              <div className="club-meta">
                <span><Icon name="users" size={14} /> {formatCount(club.members + (joined.includes(club.id) ? 1 : 0))} members</span>
                <span><Icon name="pin" size={14} /> {miles} mi</span>
              </div>
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <div className="empty-state"><Icon name="search" size={26} /><p><strong>No {category.toLowerCase()} clubs here yet.</strong><br />Try another category.</p></div>
        )}
      </div>
    </div>
  )
}

type DetailTab = 'posts' | 'events' | 'news' | 'info'

interface ClubDetailProps {
  clubId: string
  joined: boolean
  toggleJoin: () => void
  scheduledIds: string[]
  toggleSchedule: (trip: Trip) => void
  close: () => void
}

const detailTabs: { id: DetailTab; icon: 'grid' | 'calendar' | 'megaphone' | 'info'; label: string }[] = [
  { id: 'posts', icon: 'grid', label: 'Posts' },
  { id: 'events', icon: 'calendar', label: 'Events' },
  { id: 'news', icon: 'megaphone', label: 'News' },
  { id: 'info', icon: 'info', label: 'Info' },
]

export function ClubDetail({ clubId, joined, toggleJoin, scheduledIds, toggleSchedule, close }: ClubDetailProps) {
  const club: Club = clubById(clubId)
  const { openChat } = useMessages()
  const area = areas[club.zip]
  const [tab, setTab] = useState<DetailTab>('info')
  const [showContact, setShowContact] = useState(false)
  const members = club.members + (joined ? 1 : 0)

  const upcoming = [
    { id: 'e1', title: club.nextEvent, when: club.nextWhen, spots: club.spots },
    { id: 'e2', title: `${club.category} basics and meetup`, when: 'Sat, Nov 5 · 10:00 AM', spots: 20 },
    { id: 'e3', title: 'Monthly social and potluck', when: 'Sun, Nov 13 · 4:00 PM', spots: 30 },
  ]

  return (
    <div className="club-detail">
      <div className="club-cover">
        <img src={club.image} alt={`${club.name} members outdoors`} />
        <div className="cover-shade" />
        <button className="round-save back" onClick={close} aria-label="Back to clubs"><Icon name="back" /></button>
        <span className="tag white cover-tag">{club.category.toUpperCase()}</span>
      </div>

      <div className="club-head">
        <div className="club-logo">{club.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</div>
        <div className="club-head-main">
          <h2>{club.name}</h2>
          <p><Icon name="pin" size={14} /> {area.city}, {area.state} {club.zip}</p>
        </div>
      </div>

      <div className="club-stats">
        <div><strong>{members.toLocaleString()}</strong><span>Members</span></div>
        <div><strong>{club.founded}</strong><span>Founded</span></div>
        <div><strong>{club.spots}</strong><span>Spots open</span></div>
      </div>

      <div className="club-cta">
        <button className={`join-button ${joined ? 'joined' : ''}`} onClick={toggleJoin}>
          {joined ? <><Icon name="check" size={18} /> Joined</> : <><Icon name="plus" size={18} /> Join club</>}
        </button>
        <button className="contact-button" onClick={() => setShowContact(!showContact)}><Icon name="mail" size={18} /> Contact</button>
      </div>
      {showContact && <div className="contact-card"><Icon name="mail" size={18} /><div><strong>{club.owner}, club owner</strong><span>{club.email}</span></div><button className="mini-message" onClick={() => openChat({ name: club.owner, role: 'Club owner', subtitle: club.name })}>Message</button></div>}

      <div className="detail-tabs" role="tablist">
        {detailTabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)} aria-label={t.label}>
            <Icon name={t.icon} size={21} /><small>{t.label}</small>
          </button>
        ))}
      </div>

      <div className="detail-body">
        {tab === 'info' && (
          <>
            <section className="mission-card">
              <span className="kicker">Our mission</span>
              <p>“{club.mission}”</p>
            </section>
            <section className="info-block"><h3>About</h3><p>{club.about}</p></section>
            <section className="facts">
              <div><span>Meets</span><strong>{club.meets}</strong></div>
              <div><span>Experience</span><strong>{club.level}</strong></div>
              <div><span>Location</span><strong>{area.city}, {area.state}</strong></div>
              <div><span>Organizer</span><strong>{club.owner}</strong></div>
            </section>
          </>
        )}

        {tab === 'events' && (
          <div className="detail-events">
            {upcoming.map((ev, i) => {
              const trip = clubEventTrip(club, ev.title, ev.when, ev.spots, i)
              const on = scheduledIds.includes(trip.id)
              return (
                <div key={ev.id} className="detail-event">
                  <div><span className="kicker">{ev.when}</span><h3>{ev.title}</h3><p><Icon name="users" size={13} /> {ev.spots} spots left</p></div>
                  <button className={on ? 'on' : ''} onClick={() => toggleSchedule(trip)} aria-label={on ? 'Remove from schedule' : 'Add to schedule'}>
                    <Icon name={on ? 'check' : 'plus'} size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'news' && (
          <div className="news-list">
            {club.announcements.map((text, i) => (
              <article key={text}><div className="news-icon"><Icon name="megaphone" size={18} /></div><div><span className="kicker">{i === 0 ? 'Today' : i === 1 ? '2 days ago' : 'Last week'} · {club.owner}</span><p>{text}</p></div></article>
            ))}
          </div>
        )}

        {tab === 'posts' && (
          <div className="club-gallery">
            {club.gallery.map((src, i) => <img key={src + i} src={src} alt={`${club.name} post ${i + 1}`} loading="lazy" className={i === 0 ? 'wide' : ''} />)}
          </div>
        )}
      </div>
    </div>
  )
}
