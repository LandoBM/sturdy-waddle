import { hikeImage, trailImage } from './data'
import { Icon } from './Icon'
import { ME, type Post } from './posts'

interface ProfileScreenProps {
  myPosts: Post[]
  compose: () => void
}

export function ProfileScreen({ myPosts, compose }: ProfileScreenProps) {
  return (
    <div className="screen profile-screen">
      <div className="profile-top">
        <button className="icon-button" onClick={compose} aria-label="New post"><Icon name="plus" /></button>
        <button className="icon-button" aria-label="Settings"><Icon name="menu" /></button>
      </div>
      <div className="profile-identity">
        <div className="profile-avatar">{ME.handle.slice(0, 2).toUpperCase()}<span /></div>
        <h1>@{ME.handle}</h1>
        <p>Los Angeles, CA</p>
        <button className="outline-button">Edit profile</button>
      </div>
      <div className="stats">
        <div><strong>{2 + myPosts.length}</strong><span>Posts</span></div>
        <div><strong>386</strong><span>Followers</span></div>
        <div><strong>8</strong><span>Clubs</span></div>
      </div>
      <div className="profile-bio">
        <span className="kicker">ABOUT YOU</span>
        <p>Chasing views, good coffee, and better company. Usually outside by sunrise.</p>
      </div>
      <div className="achievement">
        <div className="achievement-icon"><Icon name="spark" size={28} /></div>
        <div><span className="kicker">LATEST BADGE</span><h3>Early Riser</h3><p>5 sunrise adventures completed</p></div>
        <Icon name="chevron" />
      </div>
      <div className="profile-tabs">
        <button className="active">Moments</button>
        <button>Saved</button>
        <button>Clubs</button>
      </div>
      <div className="photo-grid">
        <button className="empty-tile" onClick={compose}><Icon name="plus" /><span>New post</span></button>
        {myPosts.map((p) =>
          p.image ? (
            <img key={p.id} src={p.image} alt={p.text || 'Your post'} />
          ) : (
            <div key={p.id} className="text-tile"><p>{p.text}</p></div>
          ),
        )}
        <img src={hikeImage} alt="Hiking memory" />
        <img src={trailImage} alt="Trail memory" />
      </div>
    </div>
  )
}