# FitHive

FitHive — “The Gateway of Fitness to All” — is a mobile-first community app for finding clubs, planning activities, and sharing updates with friends.

## Run the web app

Install dependencies and start the web app:

```sh
npm install
npm run web
```

## Run the native app

The GPS tracker and fitness integrations use native modules, so they do not run in Expo Go. Build and install the app on an iOS or Android simulator/device, then start the Metro development server:

```sh
npm run ios
# or
npm run android
```

In another terminal, run `npm start` to start the development-client server. iOS background location and Apple Health require a physical device for realistic testing. Android Health Connect must be installed and contain workout data. Users grant permissions through the operating system; supported workout records depend on the data shared by their connected health apps.

The tracker records GPS while active, including in the background, and awards 25 points for each completed activity. Background location can be stopped by the operating system if the app is force-quit or the device restricts background activity.

## Configure accounts, clubs, and maps

1. Create a Supabase project and copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the project API settings. Never put a Supabase service-role key in the app.
2. Run [`supabase/migrations/202611050001_accounts_and_clubs.sql`](./supabase/migrations/202611050001_accounts_and_clubs.sql), [`supabase/migrations/202611050002_profile_bio.sql`](./supabase/migrations/202611050002_profile_bio.sql), [`supabase/migrations/202611050003_usernames.sql`](./supabase/migrations/202611050003_usernames.sql), and [`supabase/migrations/202611050004_profile_photos.sql`](./supabase/migrations/202611050004_profile_photos.sql) in the Supabase SQL Editor. Enable email confirmation in Supabase Auth. Usernames are unique, 3–20 letters/numbers/underscores, and shown with an `@` prefix. Profile photos use a public Supabase Storage bucket with per-user upload/delete policies. Row-level security policies restrict profile, club, membership, and update access.
3. iOS route maps use Apple Maps through `react-native-maps`. Android route maps use MapLibre Native with OpenStreetMap raster tiles. No Google Maps API key is needed.
4. Sync native projects after adding native map support with `npx expo prebuild --no-clean --platform all`, then rebuild and reinstall using `npm run ios` or `npm run android`. A JavaScript refresh cannot add native modules to an already-installed app.
5. To enable live flight status, add your Aviationstack key as the Supabase Edge Function secret `AVIATIONSTACK_ACCESS_KEY` (Supabase Dashboard → Edge Functions → Secrets), then deploy with `supabase functions deploy flight-status --project-ref <project-ref>`. Never put the provider key in the mobile app or a `EXPO_PUBLIC_` variable. Flight lookup requires a plan that supports the provider's API endpoint; FitHive does not control airline updates.

The app supports a searchable activity catalog with outdoor yoga, mat and reformer Pilates, kickboxing, Muay Thai, calisthenics, tai chi, dance fitness, and many more activities. Hiking, running, walking, backpacking, and cycling activities collect GPS and show a route on Apple Maps (iOS) or OpenStreetMap tiles via MapLibre (Android); other catalog activities record duration without location access. OpenStreetMap attribution is shown on the Android map. The public OpenStreetMap tile and Overpass services are rate-limited and best-effort; use a provider or hosted service with terms appropriate to production usage if the app scales. Activity discovery accepts postal codes for the United States, Canada, and the United Kingdom, resolves them to coordinates, and searches OpenStreetMap for nearby parks, trails, sports areas, and fitness places. U.S. postal-code searches always show two general activity ideas even when map listings are unavailable; they are suggestions, not verified nearby venues, scheduled classes, or events. Find activities near me explains the location use before requesting OS permission; the current location is used for the search and is not saved. Postal-code and map-feature coverage depends on the public data providers. The schedule includes a weekly calendar and daily movement rings. On iOS, ring data comes from Apple Health; on Android, Health Connect provides exercise sessions, active calories, and movement hours (steps recorded during an hour are a movement-hour estimate, not device stand-time data). Compatible wearable brands can sync through Apple Health or Health Connect if their companion apps share data there; FitHive does not currently have direct vendor-account integrations. Signing up creates a user profile, not a club page. Club pages are stored in Supabase and appear after a verified club owner creates them; the demo club catalog is separate local sample data. Club owners can create/edit club pages, publish updates, and accept or decline join requests. Owner certification currently checks only that the account's email is confirmed. It does **not** verify legal ownership or identity and should not be treated as robust fraud prevention.
The feed currently keeps demo and newly created posts in app memory; the pull-to-refresh gesture is available, but new posts from other accounts cannot load until a shared posts backend is added.

The sign-up terms and club-owner documents are explicit **draft placeholders**, not a legally effective liability waiver. They do not guarantee that the developer is released from liability. Obtain counsel-approved documents and replace the draft text and version before public release.

## Checks

```sh
npm test
npm run typecheck
```
