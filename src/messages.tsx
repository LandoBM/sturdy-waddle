import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { clubs, people } from './data'
import { Icon } from './Icon'

export interface Contact {
  name: string
  role: string
  subtitle: string
}

interface Message {
  id: string
  from: 'me' | 'them'
  text: string
  time: string
}

interface Thread {
  id: string
  contact: Contact
  messages: Message[]
  unread: number
}

export interface UnreadThread {
  contact: Contact
  text: string
  time: string
  count: number
}

interface MessagesApi {
  openInbox: () => void
  openChat: (contact: Contact) => void
  unread: number
  unreadThreads: UnreadThread[]
}

const MessagesContext = createContext<MessagesApi>({ openInbox: () => {}, openChat: () => {}, unread: 0, unreadThreads: [] })
export const useMessages = () => useContext(MessagesContext)

const now = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const uid = () => Math.random().toString(36).slice(2, 9)

const photoFor = (name: string) => people.find((p) => p.name === name)?.photo
const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2)

function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const photo = photoFor(name)
  return photo
    ? <img className="msg-avatar" src={photo} alt="" style={{ width: size, height: size }} />
    : <span className="msg-avatar initials" style={{ width: size, height: size }}>{initials(name)}</span>
}

const seedThreads: Thread[] = [
  {
    id: 'Nia Alvarez',
    contact: { name: 'Nia Alvarez', role: 'Club owner', subtitle: 'Horizon Hikers' },
    unread: 1,
    messages: [
      { id: 'a1', from: 'them', text: 'Welcome to Horizon Hikers! Glad you joined.', time: '9:12 AM' },
      { id: 'a2', from: 'me', text: 'Thanks! Any tips for the ridge walk on Thursday?', time: '9:20 AM' },
      { id: 'a3', from: 'them', text: 'Bring a light jacket and water. We meet by the west trailhead 15 minutes early.', time: '9:41 AM' },
    ],
  },
  {
    id: 'Maya Ortiz',
    contact: { name: 'Maya Ortiz', role: 'Member', subtitle: 'Hikes with Horizon Hikers' },
    unread: 0,
    messages: [
      { id: 'b1', from: 'them', text: 'Are you carpooling to Eagle Rock on Saturday?', time: 'Yesterday' },
      { id: 'b2', from: 'me', text: 'Yes! I have two open seats.', time: 'Yesterday' },
    ],
  },
]

const replies: Record<string, string[]> = {
  'Club owner': [
    'Thanks for reaching out! Happy to help. Event details are on the club page, and I will confirm the meeting spot the day before.',
    'Good question. Spots are first come, first served, so reserve early if you can.',
    'Sounds great. See you there!',
  ],
  Member: ['Sounds good to me!', 'Nice, count me in.', 'Let me check and get back to you.'],
}

// Unique club owners shown as quick contacts.
const owners: Contact[] = Array.from(new Map(clubs.map((c) => [c.owner, c])).values())
  .slice(0, 7)
  .map((c) => ({ name: c.owner, role: 'Club owner', subtitle: c.name }))

type View = null | { type: 'inbox' } | { type: 'thread'; id: string }

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>(seedThreads)
  const [view, setView] = useState<View>(null)
  const [typing, setTyping] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>(null)
  viewRef.current = view

  const unread = threads.reduce((n, t) => n + t.unread, 0)
  const unreadThreads: UnreadThread[] = threads
    .filter((t) => t.unread > 0)
    .map((t) => {
      const last = [...t.messages].reverse().find((m) => m.from === 'them')
      return { contact: t.contact, text: last?.text ?? '', time: last?.time ?? '', count: t.unread }
    })
  const active = view?.type === 'thread' ? threads.find((t) => t.id === view.id) : undefined

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [active?.messages.length, typing])

  const openThread = (id: string) => {
    setThreads((l) => l.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
    setDraft('')
    setView({ type: 'thread', id })
  }

  const openChat = (contact: Contact) => {
    setThreads((l) => (l.some((t) => t.id === contact.name) ? l : [{ id: contact.name, contact, messages: [], unread: 0 }, ...l]))
    openThread(contact.name)
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !active) return
    const id = active.id
    const role = active.contact.role
    const count = active.messages.filter((m) => m.from === 'me').length
    setThreads((l) => l.map((t) => (t.id === id ? { ...t, messages: [...t.messages, { id: uid(), from: 'me', text, time: now() }] } : t)))
    setDraft('')
    // Demo only: there is no backend, so replies are simulated.
    setTyping(id)
    window.setTimeout(() => {
      const pool = replies[role] ?? replies.Member
      // If the user already left the chat, the reply counts as unread.
      const watching = viewRef.current?.type === 'thread' && viewRef.current.id === id
      setThreads((l) => l.map((t) => (t.id === id ? { ...t, unread: watching ? t.unread : t.unread + 1, messages: [...t.messages, { id: uid(), from: 'them', text: pool[count % pool.length], time: now() }] } : t)))
      setTyping((cur) => (cur === id ? null : cur))
    }, 1400)
  }

  const sorted = [...threads].sort((a, b) => (b.messages.length ? 1 : 0) - (a.messages.length ? 1 : 0))

  return (
    <MessagesContext.Provider value={{ openInbox: () => setView({ type: 'inbox' }), openChat, unread, unreadThreads }}>
      {children}
      {view && (
        <div className="messages-overlay">
          {view.type === 'inbox' || !active ? (
            <>
              <header className="msg-top">
                <button className="icon-button" onClick={() => setView(null)} aria-label="Close messages"><Icon name="back" /></button>
                <h1>Messages</h1>
              </header>
              <div className="msg-scroll">
                <section>
                  <span className="kicker">Message a club owner</span>
                  <div className="owner-scroll">
                    {owners.map((o) => (
                      <button key={o.name} className="owner-chip" onClick={() => openChat(o)}>
                        <Avatar name={o.name} size={54} />
                        <strong>{o.name.split(' ')[0]}</strong>
                        <span>{o.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="thread-list">
                  <span className="kicker">Conversations</span>
                  {sorted.map((t) => {
                    const last = t.messages[t.messages.length - 1]
                    return (
                      <button key={t.id} className="thread-row" onClick={() => openThread(t.id)}>
                        <Avatar name={t.contact.name} />
                        <div>
                          <div className="thread-name"><strong>{t.contact.name}</strong><span className={`role-pill ${t.contact.role === 'Club owner' ? 'owner' : ''}`}>{t.contact.role}</span></div>
                          <p className={t.unread ? 'unread' : ''}>{last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : `Start a conversation about ${t.contact.subtitle}`}</p>
                        </div>
                        <div className="thread-side">{last && <small>{last.time}</small>}{t.unread > 0 && <b>{t.unread}</b>}</div>
                      </button>
                    )
                  })}
                </section>
              </div>
            </>
          ) : (
            <>
              <header className="msg-top thread-top">
                <button className="icon-button" onClick={() => setView({ type: 'inbox' })} aria-label="Back to inbox"><Icon name="back" /></button>
                <Avatar name={active.contact.name} size={40} />
                <div><h1>{active.contact.name}</h1><p>{active.contact.role} · {active.contact.subtitle}</p></div>
              </header>
              <div className="msg-scroll chat">
                {active.messages.length === 0 && (
                  <div className="chat-empty"><Icon name="message" size={26} /><p><strong>Say hi to {active.contact.name.split(' ')[0]}</strong><br />Ask about events, spots, or how to get involved.</p></div>
                )}
                {active.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.from}`}><p>{m.text}</p><small>{m.time}</small></div>
                ))}
                {typing === active.id && <div className="bubble them typing" aria-label="Typing"><i /><i /><i /></div>}
                <div ref={endRef} />
              </div>
              <form className="chat-input" onSubmit={send}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${active.contact.name.split(' ')[0]}`} aria-label="Message" />
                <button type="submit" disabled={!draft.trim()} aria-label="Send"><Icon name="arrow" size={20} /></button>
              </form>
            </>
          )}
        </div>
      )}
    </MessagesContext.Provider>
  )
}
