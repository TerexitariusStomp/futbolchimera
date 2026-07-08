# Mobile Capability Gap Report

This document maps what the integration markdowns recommend against what the current mobile codebase in `apps/mobile-expo/App.js` can actually do.

## What Works Today

| Feature | Endpoint | Status |
|---------|----------|--------|
| Store and read AI coach prompt template | `/api/soccer/ai-coach` | Partial — file is managed, but response is rule-based |
| Store AI chat in TDAI memory | `/api/soccer/ai-chat` | Partial — stores messages, but reply is a placeholder |
| Return placeholder visualization data | `/api/soccer/visualize` | Stub only |
| Read reference markdowns by topic | `/api/soccer/reference` | Partial — returns file if it exists, otherwise a placeholder |
| Manage vision model files | `/api/soccer/models/*` | Yes — list/download/delete model files |
| Return placeholder detection result | `/api/soccer/detect` | Stub only |
| Create/edit soccer wiki pages from templates | Wiki file system | Yes |

## What Is Not Currently Possible

### 1. Real LLM-Powered AI Coach / Chat
- **Recommendation:** AI coach templates suggest LLM-generated tactical insights and chat responses.
- **Current state:** `modelStatus` is set to `'not available'`. `handleSoccerAiCoach` runs `generateLocalInsight`, a rule-based event counter. `handleSoccerAiChat` returns a hard-coded placeholder.
- **Blocker:** No on-device LLM dependency or remote inference endpoint is configured.

### 2. Generate Visualizations (Shot Maps, Pass Networks, xG Charts)
- **Recommendation:** Dashboard and xG templates reference charts and visualizations.
- **Current state:** `handleSoccerVisualize` returns JSON metadata; no chart rendering or image generation happens.
- **Blocker:** No charting library (e.g., `victory-native`, `react-native-chart-kit`, `react-native-svg`) or Python runtime (`mplsoccer`) is integrated.

### 3. Import CSV/JSON Outputs from Desktop Notebooks
- **Recommendation:** Reference files say to run notebooks on desktop and import outputs into the app.
- **Current state:** There is no bulk CSV/JSON import endpoint for notebook outputs. Users can manually paste data into wiki pages, but no automated pipeline exists.
- **Blocker:** No `/api/soccer/import` endpoint or CSV parser in the bridge.

### 4. On-Device Computer Vision (Player/Ball Detection, Jersey OCR)
- **Recommendation:** Vision guide describes converting roboflow/sports models to TensorFlow Lite / Core ML.
- **Current state:** `handleSoccerDetect` returns `status: 'model_not_loaded'`. Model files can be downloaded but are not executed.
- **Blocker:** No TFLite or Core ML runtime bindings (`react-native-fast-tflite`, `react-native-coreml`, etc.) are in `package.json`.

### 5. Live Camera / Video Analysis
- **Recommendation:** Detecting objects in match video implies camera access and frame-by-frame inference.
- **Current state:** No camera integration or video frame processing pipeline exists in the soccer integration.
- **Blocker:** `expo-camera` (or equivalent) and model inference are not wired in.

## Dependencies Missing for Full Functionality

- On-device LLM: `@localchimera/sdk` is present but not used for soccer inference.
- Charts: `react-native-svg`, `victory-native`, or similar.
- Computer vision: `react-native-fast-tflite`, `react-native-coreml`, `expo-camera`.
- Data import: `papaparse` or `csv-parse` equivalent.

## Recommended Next Step

Decide whether to:

1. **Keep mobile-only but bounded:** Update markdowns to clearly label LLM, visualization, CV, and bulk-import features as future roadmap items.
2. **Add native ML/LLM dependencies:** Integrate an on-device inference stack and charting library, which increases app size and build complexity.
3. **Use optional cloud endpoints:** Allow the app to call remote inference/visualization APIs when online, with offline placeholders.
