import { useEffect, useRef, useState, type FormEvent } from 'react'
import { people } from './data'
import { Icon } from './Icon'
import { ME, type Post } from './posts'

interface CommentsSheetProps {
  post: Post
  add: (text: string) => void
  toggleLike: (commentId: string) => void
  close: () => void
}

export function CommentAvatar({ name, mine = false, size = 36 }: { name: string; mine?: boolean; size?: number }) {
  const photo = mine ? undefined : people.find((p) => p.name === name)?.photo
  const style = { width: size, height: size }
  if (photo) return <img className="comment-avatar" src={photo} alt="" style={style} />
  return <span className="comment-avatar initials" style={style}>{name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
}

export function CommentsSheet({ post, add, toggleLike, close }: CommentsSheetProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [post.comments.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    add(text)
    setDraft('')
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="event-sheet comments-sheet" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Comments">
        <header className="compose-top">
          <span className="comments-count">{post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}</span>
          <h2>Comments</h2>
          <button type="button" className="icon-button small" onClick={close} aria-label="Close comments"><Icon name="close" size={18} /></button>
        </header>

        <div className="comments-scroll">
          <div className="comments-post">
            <CommentAvatar name={post.author} mine={post.mine} size={32} />
            <p><strong>{post.author}</strong> {post.text || 'Shared a photo'}</p>
          </div>

          {post.comments.length === 0 && (
            <div className="chat-empty"><Icon name="message" size={26} /><p><strong>No comments yet</strong><br />Be the first to say something.</p></div>
          )}

          <ul className="comment-list">
            {post.comments.map((cm) => (
              <li key={cm.id} className="comment">
                <CommentAvatar name={cm.author} mine={cm.mine} />
                <div className="comment-main">
                  <p><strong>{cm.author}</strong>{cm.mine && <em className="you-tag">You</em>}{cm.author === post.author && !cm.mine && <em className="you-tag author">Author</em>}</p>
                  <p className="comment-text">{cm.text}</p>
                  <span className="comment-time">{cm.time}</span>
                </div>
                <button className={`comment-like ${cm.liked ? 'active' : ''}`} onClick={() => toggleLike(cm.id)} aria-pressed={cm.liked} aria-label={cm.liked ? 'Unlike comment' : 'Like comment'}>
                  <Icon name="heart" size={16} filled={cm.liked} />
                  {cm.likes + (cm.liked ? 1 : 0) > 0 && <span>{cm.likes + (cm.liked ? 1 : 0)}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div ref={endRef} />
        </div>

        <form className="chat-input" onSubmit={submit}>
          <CommentAvatar name={ME.name} mine size={40} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply to ${post.author.split(' ')[0]}`} aria-label="Add a comment" maxLength={280} />
          <button type="submit" disabled={!draft.trim()} aria-label="Post comment"><Icon name="arrow" size={20} /></button>
        </form>
      </section>
    </div>
  )
}