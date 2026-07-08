# On-Device Vision Models Guide

## Model Conversion for Mobile

The roboflow/sports repository provides Python-based computer vision models. To use these on mobile devices, models must be converted to mobile-optimized formats:

### Android (TensorFlow Lite)
1. Export roboflow models to TensorFlow format
2. Convert to .tflite using TensorFlow Lite Converter
3. Integrate using react-native-fast-tflite or expo-camera with TFLite

### iOS (Core ML)
1. Export roboflow models to Core ML format
2. Convert to .mlmodel using coremltools
3. Integrate using react-native-coreml or native iOS Vision framework

## Model Types Needed

### Player Detection
- Detect player bounding boxes in video frames
- Track players across frames

### Ball Detection
- Detect ball position in video frames
- Handle ball occlusion and rapid movement

### Jersey Number OCR
- Recognize player jersey numbers
- Handle blurry/angled text

### Pitch Keypoints
- Detect pitch corners and line intersections
- Enable camera calibration

## Implementation Status

Current implementation provides placeholder functions that indicate where mobile ML models should be integrated. Full implementation requires:

1. Model conversion from roboflow/sports Python models
2. React Native ML library integration
3. Model file management and downloading
4. On-device inference pipeline

## Alternative Approach

For immediate functionality without custom ML models:
- Use cloud-based roboflow inference API
- Cache results locally
- Implement fallback when offline
