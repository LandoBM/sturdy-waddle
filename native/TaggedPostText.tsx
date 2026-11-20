import type { PostTag } from '../src/posts'
import { MentionText } from './MentionText'

export function TaggedPostText({ body, tags = [], color, orange = '#FF7900', onOpenProfile, onOpenClub }: { body: string; tags?: PostTag[]; color: string; orange?: string; onOpenProfile?: (id: string) => void; onOpenClub?: (id: string) => void }) {
  return <MentionText text={body} tags={tags} color={color} orange={orange} onOpenProfile={onOpenProfile} onOpenClub={onOpenClub} />
}
