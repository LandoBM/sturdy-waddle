import type { Comment } from '../src/posts'

export function topLevelComments(comments: Comment[]) {
  return comments.filter((comment) => !comment.parentId)
}

export function repliesForComment(comments: Comment[], parentId: string) {
  return comments.filter((comment) => comment.parentId === parentId)
}
