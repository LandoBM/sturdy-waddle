import { useMemo, useState } from 'react'
import { areas, clubById, clubs, media, people, personById, type MediaItem, type Person } from './data'
import { Icon } from './Icon'
import { useMessages } from './messages'
import { Header, formatCount } from './ui'

interface ExploreScreenProps {
  joined: string[]
  toggleJoin: (id: string) => void
  openClub: (id: string) => void
}

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function ExploreScreen({ joined, toggleJoin, openClub }: ExploreScreenProps) {
  const { openChat } = useMessages()
  const [query, setQuery] = useState('')
  const [following, setFollowing] = useState<string[]>([])
  const [liked, setLiked] = useState<string[]>([])
  const [feed, setFeed] = useState(() => shuffled(media))
  const [person, setPerson] = useState<Person | null>(null)
  const [viewing, setViewing] = useState<MediaItem | null>(null)

  const q = query.trim().toLowerCase()
  const suggestedPeople = useMemo(
    () => people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.handle.includes(q) || p.bio.toLowerCase().includes(q)),
    [q],
  )
  const suggestedClubs = useMemo(
    () => clubs.filter((c) => !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, q ? 8 : 5),
    [q],
  )
  const visibleMedia = feed.filter((m) => !q || m.caption.toLowerCase().includes(q) || m.place.toLowerCase().includes(q))

  const flip = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((i) => i !== id) : [...list, id])

  return (
    <div className="screen search-screen">
      <Header eyebrow="Try something new" title="Explore" />
      <label className="search-box">
        <Icon name="search" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, clubs, places" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={18} /></button>}
      </label>

      <section className="section-tight">
        <div className="section-title compact"><div><span className="kicker">People you may know</span><h2>Suggested for you</h2></div></div>
        <div className="people-scroll">
          {suggestedPeople.map((p) => {
            const on = following.includes(p.id)
            return (
              <article key={p.id} className="person-card" onClick={() => setPerson(p)}>
                <img src={p.photo} alt={p.name} loading="lazy" />
                <strong>{p.name}</strong>
                <span>{p.mutual} mutual clubs</span>
                <button className={on ? 'on' : ''} onClick={(e) => { e.stopPropagation(); flip(following, setFollowing, p.id) }}>
                  {on ? 'Following' : 'Follow'}
                </button>
              </article>
            )
          })}
          {suggestedPeople.length === 0 && <p className="no-match">No people match “{query}”.</p>}
        </div>
      </section>

      <section className="section-tight">
        <div className="section-title compact">
          <div><span className="kicker">From the community</span><h2>Photos and videos</h2></div>
          <button className="shuffle-button" onClick={() => setFeed(shuffled(media))}><Icon name="shuffle" size={16} /> Shuffle</button>
        </div>
        <div className="media-masonry">
          {visibleMedia.map((m) => (
            <button key={m.id} className={`media-tile ${m.tall ? 'tall' : ''}`} onClick={() => setViewing(m)}>
              <img src={m.image} alt={m.caption} loading="lazy" />
              {m.type === 'video' && <span className="video-badge"><Icon name="play" size={11} filled /> {m.duration}</span>}
              <span className="media-author">@{personById(m.author).handle}</span>
            </button>
          ))}
        </div>
        {visibleMedia.length === 0 && <p className="no-match">No posts match “{query}”.</p>}
      </section>

      <section className="section-tight">
        <div className="section-title compact"><div><span className="kicker">Clubs to check out</span><h2>Suggested clubs</h2></div></div>
        <div className="suggested-clubs">
          {suggestedClubs.map((c) => {
            const on = joined.includes(c.id)
            return (
              <div key={c.id} className="suggested-club" onClick={() => openClub(c.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openClub(c.id)}>
                <img src={c.image} alt="" loading="lazy" />
                <div><strong>{c.name}</strong><span>{c.category} · {areas[c.zip].city} · {formatCount(c.members)} members</span></div>
                <button className={on ? 'on' : ''} onClick={(e) => { e.stopPropagation(); toggleJoin(c.id) }}>{on ? 'Joined' : 'Join'}</button>
              </div>
            )
          })}
          {suggestedClubs.length === 0 && <p className="no-match">No clubs match “{query}”.</p>}
        </div>
      </section>

      {person && (
        <div className="modal-backdrop" onMouseDown={() => setPerson(null)}>
          <section className="event-sheet person-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sheet-content">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={() => setPerson(null)} aria-label="Close"><Icon name="close" /></button>
              <div className="person-top"><img src={person.photo} alt={person.name} /><div><h2>{person.name}</h2><p>@{person.handle}</p></div></div>
              <p className="person-bio">{person.bio}</p>
              <div className="stats"><div><strong>{formatCount(person.followers + (following.includes(person.id) ? 1 : 0))}</strong><span>Followers</span></div><div><strong>{person.clubIds.length}</strong><span>Clubs</span></div><div><strong>{person.mutual}</strong><span>Mutual</span></div></div>
              <span className="kicker">Member of</span>
              <div className="person-clubs">
                {person.clubIds.map((id) => <button key={id} onClick={() => { setPerson(null); openClub(id) }}>{clubById(id).name}<Icon name="chevron" size={16} /></button>)}
              </div>
              <button className="message-button" onClick={() => { const c = { name: person.name, role: 'Member', subtitle: `@${person.handle}` }; setPerson(null); openChat(c) }}><Icon name="message" size={18} /> Message {person.name.split(' ')[0]}</button>
              <button className={`reserve-button ${following.includes(person.id) ? 'reserved' : ''}`} onClick={() => flip(following, setFollowing, person.id)}>
                {following.includes(person.id) ? <><Icon name="check" /> Following</> : <><Icon name="userplus" /> Follow {person.name.split(' ')[0]}</>}
              </button>
            </div>
          </section>
        </div>
      )}

      {viewing && (
        <div className="modal-backdrop" onMouseDown={() => setViewing(null)}>
          <section className="event-sheet viewer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="viewer-media">
              <img src={viewing.image} alt={viewing.caption} />
              {viewing.type === 'video' && <span className="play-big"><Icon name="play" size={28} filled /></span>}
              <button onClick={() => setViewing(null)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <div className="sheet-content viewer-copy">
              <div className="viewer-author" onClick={() => { const p = personById(viewing.author); setViewing(null); setPerson(p) }}>
                <img src={personById(viewing.author).photo} alt="" />
                <div><strong>{personById(viewing.author).name}</strong><span><Icon name="pin" size={12} /> {viewing.place}</span></div>
              </div>
              <p>{viewing.caption}</p>
              <div className="post-actions">
                <button className={liked.includes(viewing.id) ? 'active' : ''} onClick={() => flip(liked, setLiked, viewing.id)}>
                  <Icon name="heart" filled={liked.includes(viewing.id)} /> <span>{viewing.likes + (liked.includes(viewing.id) ? 1 : 0)}</span>
                </button>
                <button><Icon name="message" /></button>
                <button><Icon name="share" /></button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}