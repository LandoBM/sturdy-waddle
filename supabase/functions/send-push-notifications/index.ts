import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { notification_id: notificationId } = await request.json()
  if (!notificationId) return new Response('notification_id is required', { status: 400 })

  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .select('id,recipient_id,title,body')
    .eq('id', notificationId)
    .single()
  if (notificationError) return Response.json({ error: notificationError.message }, { status: 404 })

  const { data: tokens, error: tokenError } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', notification.recipient_id)
  if (tokenError) return Response.json({ error: tokenError.message }, { status: 500 })

  const messages = (tokens ?? []).map(({ expo_push_token }) => ({
    to: expo_push_token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: { notificationId: notification.id },
  }))
  if (!messages.length) return Response.json({ sent: 0 })

  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  return new Response(await pushResponse.text(), {
    status: pushResponse.status,
    headers: { 'Content-Type': 'application/json' },
  })
})
