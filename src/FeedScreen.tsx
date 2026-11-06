import { people } from './data'
import { Icon } from './Icon'
import { ME, type Post } from './posts'
import { Header } from './ui'

interface FeedScreenProps {
  posts: Post[]
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  compose: () => void
  openComments: (id: string) => void
}

function Avatar({ post }: { post: Post }) {
  const photo = people.find((p) => p.name === post.author)?.photo
  if (photo) return <img className="author-avatar photo" src={photo} alt="" />
  return <span className="author-avatar">{post.author.split(' ').map((w) => w[0]).join('')}</span>
}

export function FeedScreen({ posts, toggleLike, toggleSave, compose, openComments }: FeedScreenProps) {
  const ownInitials = ME.handle.slice(0, 2).toUpperCase()
  return (
    <div className="screen">
      <Header title={`@${ME.handle}`} />
      <div className="feed-filter">
        <button className="active">Friends</button>
        <button>Clubs</button>
        <button>Explore</button>
      </div>

      <button className="compose-bar" onClick={compose}>
        <span className="author-avatar">{ownInitials}</span>
        <span>What's happening outside?</span>
        <span className="compose-bar-icon"><Icon name="plus" size={18} /></span>
      </button>

      {posts.map((post) => (
        <article key={post.id} className={`post-card ${post.image ? '' : 'text-only'}`}>
          <div className="post-author">
            <Avatar post={post} />
            <div>
              <strong>@{post.handle}{post.mine && <em className="you-tag">You</em>}</strong>
              <p>{post.club ? `with ${post.club} · ` : ''}{post.time}</p>
            </div>
            <button aria-label="More"><Icon name="menu" size={21} /></button>
          </div>
          {post.text && <p className={post.image ? 'post-copy' : 'post-copy big'}>{post.text}</p>}
          {post.image && (
            <div className="post-image">
              <img src={post.image} alt={post.text || `Photo by @${post.handle}`} />
              {post.location && <span className="location-pill"><Icon name="map" size={14} /> {post.location}</span>}
            </div>
          )}
          {!post.image && post.location && <p className="text-location"><Icon name="pin" size={14} /> {post.location}</p>}
          <div className="post-actions">
            <button className={post.liked ? 'active' : ''} onClick={() => toggleLike(post.id)} aria-pressed={post.liked}>
              <Icon name="heart" filled={post.liked} /> <span>{post.likes}</span>
            </button>
            <button aria-label={`View ${post.comments.length} comments`} onClick={() => openComments(post.id)}><Icon name="message" /> <span>{post.comments.length}</span></button>
            <button aria-label="Share"><Icon name="share" /></button>
            <button className={`save ${post.saved ? 'active' : ''}`} onClick={() => toggleSave(post.id)} aria-label="Save post" aria-pressed={post.saved}>
              <Icon name="bookmark" filled={post.saved} />
            </button>
          </div>
          {post.comments.length > 0 && (
            <div className="comment-preview">
              {post.comments.length > 2 && (
                <button className="view-comments" onClick={() => openComments(post.id)}>View all {post.comments.length} comments</button>
              )}
              {post.comments.slice(-2).map((cm) => (
                <p key={cm.id}><strong>@{cm.handle}</strong> {cm.text}</p>
              ))}
            </div>
          )}
          <button className="add-comment-row" onClick={() => openComments(post.id)}>
            <span className="author-avatar mini">{ownInitials}</span> Add a comment
          </button>
        </article>
      ))}
    </div>
  )
}