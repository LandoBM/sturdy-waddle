import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveClubMedia(client: SupabaseClient, value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  const marker = '/storage/v1/object/'
  const markerIndex = normalized.indexOf(marker)
  if (normalized.startsWith('http') && markerIndex < 0) return normalized
  const objectPath = markerIndex >= 0
    ? decodeURIComponent(normalized.slice(markerIndex).split('/club-media/')[1]?.split('?')[0] ?? '')
    : normalized
  if (!objectPath) return null
  const { data, error } = await client.storage.from('club-media').createSignedUrl(objectPath, 60 * 60)
  if (error) return null
  return data?.signedUrl ?? null
}
