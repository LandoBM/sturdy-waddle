import { useState } from 'react'
import { BookingPage, EventSheet } from './Booking'
import { ClubDetail, ClubsScreen } from './ClubsScreen'
import { CommentsSheet } from './Comments'
import { ComposeSheet } from './Compose'
import { ExploreScreen } from './ExploreScreen'
import { FeedScreen } from './FeedScreen'
import { Icon } from './Icon'
import { MessagesProvider } from './messages'
import { NotificationsProvider, useNotifications } from './notifications'
import { ProfileScreen } from './ProfileScreen'
import { ScheduleScreen } from './ScheduleScreen'
import { people } from './data'
import { ME, seedPosts } from './posts'
import { tripById } from './trips'

const nav = [
  { id: 'home', label: 'Clubs' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'feed', label: 'Feed' },
  { id: 'search', label: 'Explore' },
  { id: 'profile', label: 'Profile' },
]

const cheers = ['Love this!', 'Count me in next time.', 'Great energy, see you out there.', 'Yes! This is the vibe.']

function PhoneContent() {
  const { push } = useNotifications()
  const [tab, setTab] = useState('feed')
  const [sheetTrip, setSheetTrip] = useState(null)
  const [bookingTrip, setBookingTrip] = useState(null)
  const [reserved, setReserved] = useState(['t3', 't6'])
  const [scheduleIds, setScheduleIds] = useState(['t1', 't3', 't4', 't6'])
  const [joined, setJoined] = useState(['club-0'])
  const [plans, setPlans] = useState([])
  const [clubOpen, setClubOpen] = useState(null)
  const [posts, setPosts] = useState(seedPosts)
  const [composing, setComposing] = useState(false)
  const [commentsPost, setCommentsPost] = useState(null)

  const toggleJoin = (id) =>
    setJoined((list) => (list.includes(id) ? list.filter((i) => i !== id) : [...list, id]))

  const addToSchedule = (trip) => setScheduleIds((list) => (list.includes(trip.id) ? list : [...list, trip.id]))
  const removeFromSchedule = (id) => {
    setScheduleIds((list) => list.filter((i) => i !== id))
    setReserved((list) => list.filter((i) => i !== id))
  }
  const toggleSchedule = (trip) => (scheduleIds.includes(trip.id) ? removeFromSchedule(trip.id) : addToSchedule(trip))

  const patchPost = (id, patch) =>
    setPosts((list) => list.map((post) => (post.id === id ? { ...post, ...patch(post) } : post)))
  const toggleLike = (id) => patchPost(id, (post) => ({ liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }))
  const toggleSave = (id) => patchPost(id, (post) => ({ saved: !post.saved }))

  const addComment = (postId, text) =>
    patchPost(postId, (post) => ({ comments: [...post.comments, { id: `cm-${Date.now()}`, author: ME.name, mine: true, text, time: 'Just now', likes: 0, liked: false }] }))
  const toggleCommentLike = (postId, commentId) =>
    patchPost(postId, (post) => ({
      comments: post.comments.map((comment) => (comment.id === commentId ? { ...comment, liked: !comment.liked } : comment)),
    }))

  const submitPost = (draft) => {
    const id = `mine-${Date.now()}`
    setPosts((list) => [{ id, author: ME.name, handle: ME.handle, mine: true, ...draft, time: 'Just now', likes: 0, comments: [], liked: false, saved: false }, ...list])
    setComposing(false)
    setTab('feed')
    setClubOpen(null)
    setBookingTrip(null)

    const fans = [...people].sort(() => Math.random() - 0.5)
    const snippet = draft.text ? `“${draft.text.slice(0, 60)}${draft.text.length > 60 ? '…' : ''}”` : 'Your photo'
    window.setTimeout(() => {
      const extra = 4 + Math.floor(Math.random() * 9)
      patchPost(id, (post) => ({ likes: post.likes + 2 + extra }))
      push({ kind: 'like', people: [fans[0].name, fans[1].name], title: `${fans[0].name}, ${fans[1].name} and ${extra} others liked your post`, body: snippet })
    }, 4000)
    window.setTimeout(() => {
      const text = cheers[Math.floor(Math.random() * cheers.length)]
      patchPost(id, (post) => ({ comments: [...post.comments, { id: `cm-${Date.now()}`, author: fans[2].name, mine: false, text, time: 'Just now', likes: 0, liked: false }] }))
      push({ kind: 'comment', people: [fans[2].name], title: `${fans[2].name} commented on your post`, body: `“${text}”` })
    }, 9000)
  }

  const goTo = (next) => {
    setClubOpen(null)
    setBookingTrip(null)
    setTab(next)
  }

  const openCompose = () => setComposing(true)

  return (
    <>
      <div className="status-bar"><span>9:41</span><div className="island" /><div className="status-icons"><i /><i /><b /></div></div>
      <div className="viewport">
        {tab === 'home' && <ClubsScreen joined={joined} openClub={setClubOpen} />}
        {tab === 'schedule' && <ScheduleScreen items={scheduleIds.map((id) => tripById(id)).filter(Boolean)} joined={joined} reserved={reserved} openTrip={setSheetTrip} addTrip={addToSchedule} />}
        {tab === 'feed' && <FeedScreen posts={posts} toggleLike={toggleLike} toggleSave={toggleSave} compose={openCompose} openComments={setCommentsPost} />}
        {tab === 'search' && <ExploreScreen joined={joined} toggleJoin={toggleJoin} openClub={setClubOpen} />}
        {tab === 'profile' && <ProfileScreen myPosts={posts.filter((post) => post.mine)} compose={openCompose} />}
      </div>
      {bookingTrip && (
        <BookingPage
          key={bookingTrip}
          trip={tripById(bookingTrip)}
          plans={plans.filter((plan) => plan.tripId === bookingTrip)}
          addPlan={(plan) => setPlans((list) => [...list, plan])}
          removePlan={(id) => setPlans((list) => list.filter((plan) => plan.id !== id))}
          back={() => setBookingTrip(null)}
          cancel={() => {
            setReserved((list) => list.filter((i) => i !== bookingTrip))
            setBookingTrip(null)
          }}
          openClub={() => {
            setClubOpen(tripById(bookingTrip).clubId)
            setBookingTrip(null)
          }}
        />
      )}
      {clubOpen && (
        <ClubDetail
          key={clubOpen}
          clubId={clubOpen}
          joined={joined.includes(clubOpen)}
          toggleJoin={() => toggleJoin(clubOpen)}
          scheduledIds={scheduleIds}
          toggleSchedule={toggleSchedule}
          close={() => setClubOpen(null)}
        />
      )}
      <nav className="bottom-nav">
        {nav.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => goTo(item.id)}>
            <span><Icon name={item.id} filled={tab === item.id && item.id === 'feed'} /></span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
      {sheetTrip && (
        <EventSheet
          trip={tripById(sheetTrip)}
          reserved={reserved.includes(sheetTrip)}
          toggleReserve={() =>
            setReserved((list) => (list.includes(sheetTrip) ? list.filter((i) => i !== sheetTrip) : [...list, sheetTrip]))
          }
          viewBooking={() => {
            setBookingTrip(sheetTrip)
            setSheetTrip(null)
          }}
          removeFromSchedule={() => {
            removeFromSchedule(sheetTrip)
            setSheetTrip(null)
          }}
          close={() => setSheetTrip(null)}
        />
      )}
      {commentsPost && posts.some((post) => post.id === commentsPost) && (
        <CommentsSheet
          post={posts.find((post) => post.id === commentsPost)}
          add={(text) => addComment(commentsPost, text)}
          toggleLike={(commentId) => toggleCommentLike(commentsPost, commentId)}
          close={() => setCommentsPost(null)}
        />
      )}
      {composing && <ComposeSheet joined={joined} submit={submitPost} close={() => setComposing(false)} />}
    </>
  )
}

export default function App() {
  return (
    <main className="app-shell">
      <div className="desktop-note">
        <div className="brand-symbol"><span /><span /></div>
        <div className="desktop-brand">FitHive</div>
        <p>Outside is better<br /><strong>together.</strong></p>
      </div>
      <div className="phone">
        <MessagesProvider>
          <NotificationsProvider>
            <PhoneContent />
          </NotificationsProvider>
        </MessagesProvider>
      </div>
    </main>
  )
}
