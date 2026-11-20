export const CLUB_SKILL_LEVELS = ['beginner', 'intermediate', 'experienced'] as const

export type ClubSkillLevel = typeof CLUB_SKILL_LEVELS[number]

export const CLUB_SKILL_LEVEL_OPTIONS: Array<{ value: ClubSkillLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Beginner', description: 'New to the activity and building confidence.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with the basics and ready for more.' },
  { value: 'experienced', label: 'Experienced', description: 'Experienced participants looking for a challenge.' },
]

export function normalizeClubSkillLevels(value: unknown): ClubSkillLevel[] {
  if (!Array.isArray(value)) return []
  return CLUB_SKILL_LEVELS.filter((level) => value.includes(level))
}
