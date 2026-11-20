import { Text } from 'react-native'
import type { PostTag } from '../src/posts'
import { mentionTokens } from '../src/postTags'

type MentionTextProps = {
  text: string
  tags?: PostTag[]
  color: string
  orange?: string
  onOpenProfile?: (profileId: string) => void
  onOpenClub?: (clubId: string) => void
  style?: any
}

export function MentionText({ text, tags = [], color, orange = '#FF7900', onOpenProfile, onOpenClub, style }: MentionTextProps) {
  return <Text style={[{ color }, style]}>
    {mentionTokens(text, tags).map((segment, index) => {
      const tag = segment.tag
      if (tag?.kind === 'profile' && tag.profileId) {
        return <Text key={`${segment.text}-${index}`} onPress={() => onOpenProfile?.(tag.profileId!)} style={{ color: orange, fontWeight: '800' }}>{segment.text}</Text>
      }
      if (tag?.kind === 'club' && tag.clubId) {
        return <Text key={`${segment.text}-${index}`} onPress={() => onOpenClub?.(tag.clubId!)} style={{ color: orange, fontWeight: '800' }}>{segment.text}</Text>
      }
      return <Text key={`${segment.text}-${index}`}>{segment.text}</Text>
    })}
  </Text>
}
