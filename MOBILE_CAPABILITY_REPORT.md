# Mobile Capability Report

This document maps what the integration markdowns recommend against what the current mobile codebase in `apps/mobile-expo/App.js` can actually do.

**Scope note:** On-device computer vision and live video analysis are explicitly out of scope for this production integration.

## Production-Ready Features

| Feature | Endpoint | Status |
|---------|----------|--------|
| AI coach analysis (LLM or local fallback) | `POST /api/soccer/ai-coach` | Ready — uses remote LLM when configured, falls back to local event analysis |
| AI coaching chat with memory | `POST /api/soccer/ai-chat` | Ready — uses TDAI memory and remote LLM when configured |
| Chart-ready visualization data | `POST /api/soccer/visualize` | Ready — returns structured data for event summary, shot map, passing network, xG timeline |
| Reference markdowns by topic | `GET /api/soccer/reference` | Ready — reads bundled or imported markdown files |
| Import CSV/JSON notebook outputs | `POST /api/soccer/import` | Ready — parses CSV/JSON and creates wiki pages |
| Configure LLM provider | `POST/GET /api/soccer/llm-config` | Ready — stores OpenAI-compatible endpoint + API key |
| Create/edit soccer wiki pages from templates | Wiki file system | Ready |

## Out of Scope

### On-Device Computer Vision and Live Video Analysis
- Player/ball detection, jersey number OCR, pitch keypoints, and camera-based analysis are **not included** in this production build.
- The `roboflow/sports` submodule remains tracked for upstream reference, but no mobile inference or camera pipeline is implemented.

## Remaining Production Considerations

### 1. LLM Requires User Configuration
- **Recommendation:** AI coach templates and chat expect LLM-generated insights.
- **Current state:** The app calls a remote OpenAI-compatible endpoint only after the user configures `provider`, `baseUrl`, `apiKey`, and `model` via `/api/soccer/llm-config`.
- **Action required:** UI must expose the LLM config screen.

### 2. Visualizations Need a Frontend Charting Library
- **Recommendation:** Dashboard and xG templates reference charts and visualizations.
- **Current state:** `/api/soccer/visualize` returns structured JSON (labels/values, shot coordinates, node/link lists, xG timeline points).
- **Action required:** Frontend must render this data with a charting library such as `react-native-chart-kit`, `victory-native`, or Chart.js inside the WebView.

### 3. Reference Content is Bundled or Imported
- **Recommendation:** Reference files describe analytics concepts and repositories.
- **Current state:** Reference markdowns are bundled in `apps/mobile-expo/`. Users can also import custom reference files via `/api/soccer/import` or the wiki file system.

## Dependencies Used for Production Features

- File system, memory, bridge: `expo-file-system`, React Native WebView bridge
- LLM: standard `fetch` to OpenAI-compatible `/chat/completions` endpoint
- Charts: frontend-only (not in `package.json` yet; to be chosen by frontend implementer)
- Data import: built-in `JSON.parse` + simple CSV parser in `handleSoccerImport`

## Optional Enhancements

- Add `expo-document-picker` for selecting CSV/JSON files from device storage.
- Add a frontend charting dependency and wire `/api/soccer/visualize` responses to chart components.
- Add a UI form for `/api/soccer/llm-config` so users can enter API keys securely.
