# Outside

Outside is a mobile-first community app for finding outdoor clubs, planning events, and sharing updates with friends.

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

## Checks

```sh
npm test
npm run typecheck
```
