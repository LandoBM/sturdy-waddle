import { createContext, useContext, useState, type ReactNode } from 'react'
import { people } from './data'
import { Icon, type IconName } from './Icon'
import { useMessages } from './messages'

export type NoticeKind = 'like' | 'comment' | 'follow' | 'club' | 'event'

export interface Notice {
  id: string
  kind: NoticeKind
  people: string[]
  title: string
  body?: string
  time: string
  unread: boolean
}

interface NotificationsApi {
  openNotifications: () => void
  unread: number
  push: (notice: Omit<Notice, 'id' | 'unread' | 'time'>) => void
}

const NotificationsContext = createContext<NotificationsApi>({ openNotifications: () => {}, unread: 0, push: () => {} })
export const useNotifications = () => useContext(NotificationsContext)

const seed: Notice[] = [
  { id: 'n1', kind: 'like', people: ['Maya Ortiz', 'Daniel Reyes', 'Priya Shah'], title: 'Maya Ortiz, Daniel Reyes and 12 others liked your post', body: 'Sunrise at Eagle Rock was unreal.', time: '5m', unread: true },
  { id: 'n2', kind: 'follow', people: ['Sofia Rinaldi'], title: 'Sofia Rinaldi started following you', time: '32m', unread: true },
  { id: 'n3', kind: 'comment', people: ['Lena Brooks'], title: 'Lena Brooks commented on your post', body: '“Take me next time!”', time: '1h', unread: false },
  { id: 'n4', kind: 'club', people: ['Nia Alvarez'], title: 'Horizon Hikers posted an announcement', body: 'Thursday’s ridge walk meets at the west trailhead.', time: '3h', unread: false },
  { id: 'n5', kind: 'event', people: [], title: 'Golden Hour Ridge Walk is coming up', body: 'Thursday at 4:30 PM in Griffith Park.', time: 'Yesterday', unread: false },
]

const kindIcon: Record<NoticeKind, IconName> = { like: 'heart', comment: 'message', follow: 'userplus', club: 'megaphone', event: 'calendar' }

type Filter = 'all' | 'likes' | 'messages'

function Face({ names, kind }: { names: string[]; kind: NoticeKind }) {
  const photo = names.length ? people.find((p) => p.name === names[0])?.photo : undefined
  return (
    <div className="notice-face">
      {photo ? <img src={photo} alt="" /> : <span className="notice-fallback"><Icon name={kindIcon[kind]} size={20} /></span>}
      <i className={`notice-badge ${kind}`}><Icon name={kindIcon[kind]} size={10} filled={kind === 'like'} /></i>
    </div>
  )
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { unreadThreads, openChat } = useMessages()
  const [notices, setNotices] = useState<Notice[]>(seed)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const social = notices.filter((n) => n.unread).length
  const unread = social + unreadThreads.length

  const push: NotificationsApi['push'] = (n) =>
    setNotices((l) => [{ ...n, id: `live-${Date.now()}-${l.length}`, unread: true, time: 'Just now' }, ...l])

  const markRead = (id: string) => setNotices((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  const markAll = () => setNotices((l) => l.map((n) => ({ ...n, unread: false })))

  const showMessages = filter !== 'likes'
  const visible = notices.filter((n) => filter === 'all' || (filter === 'likes' && (n.kind === 'like' || n.kind === 'comment')))
  const fresh = visible.filter((n) => n.unread)
  const earlier = visible.filter((n) => !n.unread)

  const row = (n: Notice) => (
    <button key={n.id} className={`notice-row ${n.unread ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
      <Face names={n.people} kind={n.kind} />
      <div>
        <p>{n.title}</p>
        {n.body && <span>{n.body}</span>}
      </div>
      <small>{n.time}</small>
    </button>
  )

  return (
    <NotificationsContext.Provider value={{ openNotifications: () => setOpen(true), unread, push }}>
      {children}
      {open && (
        <div className="messages-overlay">
          <header className="msg-top">
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close notifications"><Icon name="back" /></button>
            <h1>Notifications</h1>
            {unread > 0 && <button className="mark-all" onClick={markAll}>Mark all read</button>}
          </header>
          <div className="msg-scroll">
            <div className="chip-row notice-filters">
              {(['all', 'likes', 'messages'] as Filter[]).map((f) => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'likes' ? 'Likes and comments' : 'Messages'}
                </button>
              ))}
            </div>

            {showMessages && unreadThreads.length > 0 && (
              <section className="notice-group">
                <span className="kicker">New messages</span>
                {unreadThreads.map((t) => (
                  <button key={t.contact.name} className="notice-row unread" onClick={() => { setOpen(false); openChat(t.contact) }}>
                    <div className="notice-face">
                      {(() => {
                        const photo = people.find((p) => p.name === t.contact.name)?.photo
                        return photo ? <img src={photo} alt="" /> : <span className="notice-fallback">{t.contact.name[0]}</span>
                      })()}
                      <i className="notice-badge message"><Icon name="message" size={10} /></i>
                    </div>
                    <div>
                      <p>{t.contact.name} sent you {t.count > 1 ? `${t.count} messages` : 'a message'}</p>
                      <span>{t.text}</span>
                    </div>
                    <small>{t.time}</small>
                  </button>
                ))}
              </section>
            )}

            {filter !== 'messages' && fresh.length > 0 && <section className="notice-group"><span className="kicker">New</span>{fresh.map(row)}</section>}
            {filter !== 'messages' && earlier.length > 0 && <section className="notice-group"><span className="kicker">Earlier</span>{earlier.map(row)}</section>}

            {((filter === 'messages' && unreadThreads.length === 0) || (filter === 'likes' && visible.length === 0) || (filter === 'all' && visible.length === 0 && unreadThreads.length === 0)) && (
              <div className="empty-state"><Icon name="bell" size={26} /><p><strong>You're all caught up.</strong><br />New likes and messages will show up here.</p></div>
            )}
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  )
}
