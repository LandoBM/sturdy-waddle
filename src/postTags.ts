import type { PostTag } from './posts'

export type MentionToken = { start: number; end: number; query: string }

export function activeMentionToken(text: string, cursor: number): MentionToken | null {
  const before = text.slice(0, cursor)
  const match = before.match(/(^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{0,24})$/)
  if (!match) return null
  const query = match[2]
  const start = cursor - query.length - 1
  return { start, end: cursor, query }
}

export function insertMention(text: string, token: MentionToken, tag: PostTag) {
  const handle = tag.kind === 'profile' ? tag.handle : tag.handle || tag.label.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${text.slice(0, token.start)}@${handle}${text.slice(token.end)}`
}

export function mentionTokens(text: string, tags: PostTag[]) {
  const normalizeHandle = (handle: string) => handle.trim().replace(/^@+/, '').toLowerCase()
  const byHandle = new Map(tags.flatMap((tag) => {
    const handle = tag.handle ? normalizeHandle(tag.handle) : ''
    return handle ? [[handle, tag] as const] : []
  }))
  const segments: Array<{ text: string; tag?: PostTag }> = []
  const expression = /(^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{1,24})/g
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = expression.exec(text))) {
    const atIndex = match.index + match[1].length
    if (atIndex > cursor) segments.push({ text: text.slice(cursor, atIndex) })
    const handle = match[2]
    segments.push({ text: text.slice(atIndex, atIndex + handle.length + 1), tag: byHandle.get(handle.toLowerCase()) })
    cursor = atIndex + handle.length + 1
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments.length ? segments : [{ text }]
}
