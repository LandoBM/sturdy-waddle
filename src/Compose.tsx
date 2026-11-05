import { useRef, useState, type FormEvent } from 'react'
import { clubById } from './data'
import { Icon } from './Icon'
import { ME } from './posts'

export interface PostDraft {
  text: string
  image?: string
  location?: string
  club?: string
}

interface ComposeSheetProps {
  joined: string[]
  submit: (draft: PostDraft) => void
  close: () => void
}

const MAX = 280

export function ComposeSheet({ joined, submit, close }: ComposeSheetProps) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [location, setLocation] = useState('')
  const [club, setClub] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const canPost = text.trim().length > 0 || !!image
  const left = MAX - text.length

  const onFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file')
      return
    }
    setPhotoError('')
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canPost) return
    submit({ text: text.trim(), image, location: location.trim() || undefined, club })
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form className="event-sheet compose-sheet" onMouseDown={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <header className="compose-top">
          <button type="button" className="text-button" onClick={close}>Cancel</button>
          <h2>New post</h2>
          <button type="submit" className="post-submit" disabled={!canPost}>Post</button>
        </header>

        <div className="compose-body">
          <div className="compose-author">
            <span className="author-avatar">AK</span>
            <div><strong>{ME.name}</strong><p>@{ME.handle}</p></div>
          </div>

          <textarea
            autoFocus
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening outside?"
            aria-label="Post text"
            rows={image ? 3 : 6}
          />

          {image && (
            <div className="compose-preview">
              <img src={image} alt="Selected preview" />
              <button type="button" onClick={() => setImage(undefined)} aria-label="Remove photo"><Icon name="close" size={16} /></button>
            </div>
          )}
          {photoError && <p className="zip-error">{photoError}</p>}

          <div className="compose-options">
            <label className="compose-location">
              <Icon name="pin" size={18} />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" aria-label="Location" />
            </label>

            {joined.length > 0 && (
              <div>
                <span className="kicker">Tag a club</span>
                <div className="chip-row tag-chips">
                  {joined.map((id) => {
                    const c = clubById(id)
                    return <button key={id} type="button" className={club === c.name ? 'active' : ''} onClick={() => setClub(club === c.name ? undefined : c.name)}>{c.name}</button>
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="compose-footer">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          <button type="button" className="add-photo" onClick={() => fileRef.current?.click()}><Icon name="plus" size={16} /> {image ? 'Change photo' : 'Add photo'}</button>
          <span className={`char-count ${left < 20 ? 'low' : ''}`}>{left}</span>
        </footer>
      </form>
    </div>
  )
}