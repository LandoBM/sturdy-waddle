import { activeMentionToken, insertMention, mentionTokens } from '../src/postTags'
import { describe, expect, it } from '@jest/globals'

describe('post mentions', () => {
  const profile = { id: 'profile-1', kind: 'profile' as const, profileId: 'profile-1', label: 'Alex', handle: 'alex' }

  it('only activates a mention after whitespace and ignores email addresses', () => {
    expect(activeMentionToken('hike with @', 11)?.query).toBe('')
    expect(activeMentionToken('hike with @al', 13)?.query).toBe('al')
    expect(activeMentionToken('alex@example.com', 16)).toBeNull()
  })

  it('inserts a stable mention handle and marks it as tappable', () => {
    const token = activeMentionToken('with @al', 8)
    expect(token).not.toBeNull()
    expect(insertMention('with @al', token!, profile)).toBe('with @alex')
    expect(mentionTokens('with @alex', [profile])[1].tag?.profileId).toBe('profile-1')
  })

  it('supports multiple mentions next to punctuation and normalizes stored handles', () => {
    const club = { id: 'club-1', kind: 'club' as const, clubId: 'club-1', label: 'Trail Crew', handle: '@trailcrew' }
    const segments = mentionTokens('Meet (@alex), then @trailcrew!', [profile, club])
    expect(segments.filter((segment) => segment.tag).map((segment) => segment.tag?.id)).toEqual(['profile-1', 'club-1'])
    expect(segments.map((segment) => segment.text).join('')).toBe('Meet (@alex), then @trailcrew!')
  })

  it('does not turn ordinary email addresses or unknown handles into links', () => {
    const segments = mentionTokens('Email alex@example.com or @unknown', [profile])
    expect(segments.some((segment) => segment.tag)).toBe(false)
  })
})
