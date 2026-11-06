const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function respond(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Use POST to request flight status.' }, 405)

  const accessKey = Deno.env.get('AVIATIONSTACK_ACCESS_KEY')
  if (!accessKey) return respond({ error: 'Flight lookup is not configured. Add AVIATIONSTACK_ACCESS_KEY to Supabase function secrets.' }, 503)

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return respond({ error: 'Send a valid JSON body with a flightNumber.' }, 400)
  }
  const flightNumber = text(record(payload).flightNumber)?.toUpperCase().replace(/\s+/g, '') ?? ''
  const flightDate = text(record(payload).flightDate)
  const parsedFlightDate = flightDate ? new Date(`${flightDate}T00:00:00.000Z`) : null
  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber)) {
    return respond({ error: 'Enter a valid airline code and flight number, such as DL1457.' }, 400)
  }
  if (flightDate && (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate) || !parsedFlightDate || Number.isNaN(parsedFlightDate.getTime()) || parsedFlightDate.toISOString().slice(0, 10) !== flightDate)) {
    return respond({ error: 'Flight date must use a valid YYYY-MM-DD date.' }, 400)
  }

  const url = new URL('https://api.aviationstack.com/v1/flights')
  url.searchParams.set('access_key', accessKey)
  url.searchParams.set('flight_iata', flightNumber)
  if (flightDate) url.searchParams.set('flight_date', flightDate)

  let providerResponse: Response
  try {
    providerResponse = await fetch(url)
  } catch {
    return respond({ error: 'Could not reach Aviationstack. Try again later.' }, 502)
  }
  if (!providerResponse.ok) {
    return respond({ error: `Aviationstack returned HTTP ${providerResponse.status}.` }, 502)
  }

  let responseBody: unknown
  try {
    responseBody = await providerResponse.json()
  } catch {
    return respond({ error: 'Aviationstack returned an unreadable response.' }, 502)
  }
  const body = record(responseBody)
  if (body.error) {
    const providerError = record(body.error)
    return respond({ error: text(providerError.info) ?? text(providerError.message) ?? 'Aviationstack could not look up this flight.' }, 502)
  }
  const flights = Array.isArray(body.data) ? body.data : []
  if (!flights.length) return respond({ error: 'No flight status was found for that flight number.' }, 404)

  const flight = record(flights[0])
  const airline = record(flight.airline)
  const flightCode = record(flight.flight)
  const departure = record(flight.departure)
  const arrival = record(flight.arrival)
  return respond({
    flightNumber: text(flightCode.iata) ?? text(flightCode.number) ?? flightNumber,
    status: text(flight.flight_status),
    airline: text(airline.name),
    departureAirport: text(departure.airport),
    departureTerminal: text(departure.terminal),
    departureGate: text(departure.gate),
    scheduledDeparture: text(departure.scheduled),
    actualDeparture: text(departure.actual),
    arrivalAirport: text(arrival.airport),
    arrivalTerminal: text(arrival.terminal),
    arrivalGate: text(arrival.gate),
    scheduledArrival: text(arrival.scheduled),
    actualArrival: text(arrival.actual),
  })
})
