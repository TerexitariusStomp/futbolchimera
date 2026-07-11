# LocalChimera Mobile (Expo)

On-device AI-powered wiki app using `@localchimera/sdk` with Pear P2P networking. No soccer features — just QVAC on-device inference and Pear P2P sync.

## Architecture

- **Frontend**: React web app (shared with desktop) running inside a WebView
- **On-device AI**: QVAC inference via `@qvac/sdk` running inside a Bare worklet (llama.cpp)
- **P2P Networking**: Pear/Hyperswarm running inside a Bare worklet on-device
- **Bridge**: WebView ↔ React Native ↔ Bare worklet via IPC
- **Swarm Sync**: Wiki-wide and page-specific swarms are shared over Hyperswarm (UDP/DHT), not WebRTC. Use `scope: 'wiki'` for the full wiki or `scope: 'page'` with a `pageId` for a single page.

## Development

```bash
cd apps/mobile-localchimera

# Install dependencies
npm install

# Build the Pear/Hyperswarm Bare worklet bundle
npm run build:pear-worker

# Copy frontend build assets
node scripts/copy-frontend.js

# Start Expo development server
npx expo start

# Or run on Android device/emulator
npx expo run:android
```

## Building

```bash
# Build the Pear worklet bundle for mobile
npm run build:pear-worker

# Generate native Android project
npx expo prebuild --platform android --clean

# Build release APK
cd android
./gradlew assembleRelease
```

## Pear P2P Setup

The app uses `react-native-bare-kit` + `expo-bare-kit` to run a Bare worklet that
hosts `hyperswarm`. The worklet source is `pear-worker.js`; it is bundled into
`pear-worker.bundle.js` by `scripts/build-pear-worker.js` using `bare-pack`.

The app falls back to local-only swarm stubs if:
- `react-native-bare-kit` native module is unavailable
- the worker bundle has not been built
- the device cannot start the Bare runtime

## Test on a real device

```bash
cd apps/mobile-localchimera

# 1. Install dependencies and apply native patches
npm install

# 2. Build the Bare worklet bundles (Pear + QVAC)
npm run build:workers

# 3. Copy the frontend assets into the native project
node scripts/copy-frontend.js

# 4. Generate native Android / iOS projects with plugins
npx expo prebuild --clean

# 5. Run on a connected device
npx expo run:android
# or
npx expo run:ios
```

### What to verify

- App launches without crashing and the WebView frontend loads.
- `/api/ai-status` returns `qvacAvailable: true` after the model downloads (~500MB on first run).
- `/api/ai-write` returns text with `source: 'qvac-on-device'`.
- `/api/swarm/create` with `scope: 'wiki'` returns a 64-char topic and joins a Hyperswarm topic.
- `/api/swarm/create` with `scope: 'page'` and a `pageId` returns a separate topic.
- `/api/swarm/join` with a topic hex from another device joins the same swarm.
- `/api/swarm/status` reports `running: true` and connected peers.

## Notes

- On-device LLM is provided by `@qvac/sdk` (QVAC / llama.cpp). The app loads
  `LLAMA_3_2_1B_INST_Q4_0` (~500MB) on first use and falls back to unavailable
  status if BareKit/QVAC cannot be initialized.
- P2P swarming uses Hyperswarm (UDP/DHT). WebRTC is not used for the mobile P2P path.
- If BareKit/QVAC native linking fails, the app still runs; AI and swarm endpoints
  return graceful "not available" responses so the wiki frontend remains usable.
