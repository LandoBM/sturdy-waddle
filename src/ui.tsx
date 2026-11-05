import { Icon } from './Icon'
import { useMessages } from './messages'
import { useNotifications } from './notifications'

interface HeaderProps {
  eyebrow?: string
  title: string
}

export function Header({ eyebrow, title }: HeaderProps) {
  const { openInbox, unread } = useMessages()
  const { openNotifications, unread: noticeUnread } = useNotifications()
  return (
    <header className="topbar">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <button className="icon-button notification" aria-label={`Messages${unread ? `, ${unread} unread` : ''}`} onClick={openInbox}>
          <Icon name="message" />
          {unread > 0 && <span />}
        </button>
        <button className="icon-button notification" aria-label={`Notifications${noticeUnread ? `, ${noticeUnread} new` : ''}`} onClick={openNotifications}>
          <Icon name="bell" />
          {noticeUnread > 0 && <span />}
        </button>
      </div>
    </header>
  )
}

export const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : String(n))
