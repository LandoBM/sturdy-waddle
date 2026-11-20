import type { ClubSkillLevel } from './clubSkillLevels'

export type SharedClubPreview = {
  id: string
  name: string
  activity: string
  location: string
  skillLevels: ClubSkillLevel[]
  coverImageUrl?: string | null
}
