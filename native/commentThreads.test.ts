import { describe, expect, it } from '@jest/globals'
import type { Comment } from '../src/posts'
import { repliesForComment, topLevelComments } from './commentThreads'

const comment = (id: string, parentId: string | null = null): Comment => ({
  id, parentId, author: 'Alex', handle: 'alex', mine: false, text: id, time: 'Now', likes: 0, liked: false,
})

describe('inline comment threads', () => {
  it('keeps root comments separate from replies', () => {
    const comments = [comment('root'), comment('reply', 'root'), comment('other')]
    expect(topLevelComments(comments).map((item) => item.id)).toEqual(['root', 'other'])
    expect(repliesForComment(comments, 'root').map((item) => item.id)).toEqual(['reply'])
  })
})
