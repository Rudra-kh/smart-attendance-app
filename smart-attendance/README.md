# Smart Attendance (Expo + Firebase)

English-only UI. This repo contains the React Native Expo client. Admin service account keys must NOT be committed.

## Prerequisites
- Node.js LTS, Git
- Expo Go app on your phone (or Android emulator / iOS simulator)

## Install & Run
```bash
npm install
npx expo start
```

## Local Run (Instant Demo, No Keys)
`demoMode` is enabled in `app.json` so the app uses an in-memory mock instead of Firebase. You can navigate and start sessions immediately.

Run (web or device):
```powershell
cd "c:\Users\Onkar\Downloads\IOT New Version\smart-attendance"
npx expo start --web
```

Features in demo mode:
- Session creation, token rotation, results all mocked in memory.
- QR code still rotates (random demo tokens).
- No external network calls or emulators required.

Switching modes:
- Real Firebase: add your Web App config then set `demoMode=false`.
- Emulators: set `emulators.enabled=true` and install Java & firebase-tools.
 - Server (firebase-admin): run local Node server using your service account key and set `extra.server.baseUrl`.

## Firebase Setup (Client)
1. Create a Firebase project, add a Web App.
2. In `app.json`, set the `extra.firebase` fields:
```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "...",
        "authDomain": "...",
        "projectId": "...",
        "storageBucket": "...",
        "messagingSenderId": "...",
        "appId": "..."
      }
    }
  }
}
```
3. The app reads these via `expo-constants` in `src/lib/firebase.js`.
4. To switch back from emulators, set `"emulators": { "enabled": false }` in `app.json`.

## Security
- Do NOT place service account JSON inside the app. Keep it outside repo or in Secret Manager.
- We added `.gitignore` rules for `keys/` and secret patterns.
- If a service account key was exposed, rotate it in Google Cloud IAM → Service Accounts → Keys.

## Current Screens
- Splash → Welcome → Admin Login → Admin Dashboard → QR Session → Session Results

## Implemented Backend Client Features
- Session creation (Firestore `sessions`) with TTL and rotating token.
- Real-time session snapshot subscription.
- QR content = JSON `{ sessionId, token }` short random token.
- Session results screen pulls latest counts from Firestore.

## Firestore Rules
Rules draft located in `firestore.rules` (deploy with `firebase deploy --only firestore:rules`).
Key constraints:
- Only authenticated users can read sessions.
- Only creator (admin) can create/update/delete their session doc.
- Attendance document creation requires active session, valid current token, and unexpired token timestamp.

## Data Model (Draft)
`sessions/{sessionId}` fields:
- `subjectName` (string), `totalStudents` (number)
- `createdBy` (uid), `createdAt` (timestamp)
- `active` (bool), `ttlSeconds` (number)
- `currentToken` (string), `tokenExpiresAt` (timestamp)
- `scannedCount` (number)

`sessions/{sessionId}/attendance/{uid}` fields (planned student app):
- `userId` (uid), `createdAt` (timestamp), `token` (string used when scanning)

## Next Steps
1. Populate real Firebase web config values in `app.json` under `extra.firebase`.
2. Deploy `firestore.rules`.
3. Build student scanning flow to create attendance doc with current token.
4. Add Cloud Function for atomic scanned count increment + validation (defense in depth).
5. Harden: device attestation, rate limiting, anti-replay by recording token uses.

## Scripts
- `npm start` / `npx expo start` – run dev server
- `npm run android` / `npm run ios` / `npm run web`

## Local Server (uses your service account key)
A minimal Node server in `server/` uses Firebase Admin with your key for privileged operations (create/rotate/end sessions, submit attendance).

Run the server:
```powershell
cd "c:\Users\Onkar\Downloads\IOT New Version\smart-attendance\server"
npm install
$env:GOOGLE_APPLICATION_CREDENTIALS = "c:\Users\Onkar\Downloads\IOT New Version\keys\application-develpoment-firebase-adminsdk-fbsvc-da1340b305.json"
npm start
```

Point the app to the server by adding in `app.json` under `expo.extra`:
```json
{
  "server": { "baseUrl": "http://localhost:4001" },
  "demoMode": false,
  "emulators": { "enabled": false }
}
```
Now the client will call the server for create/rotate/end and attendance; it polls `GET /api/sessions/:id` for updates.

## Notes
- Reanimated plugin configured in `babel.config.js`.
- UI colors centralized in `src/theme/colors.js`.
- Typography scale in `src/theme/typography.js`.
- Token rotation currently client-driven; later move to backend (Cloud Function + server clock) for stronger integrity.
