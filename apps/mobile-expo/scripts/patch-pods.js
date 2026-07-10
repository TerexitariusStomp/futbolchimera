// Patches Pods sources after pod install for Xcode/Swift compatibility issues.
const fs = require('fs');
const path = require('path');

const podsDir = path.join(__dirname, '..', 'ios', 'Pods');
if (!fs.existsSync(podsDir)) {
  console.log('[patch-pods] Pods directory not found, skipping');
  process.exit(0);
}

// Patch expo-device UIDevice.swift in Pods if it still uses TARGET_OS_SIMULATOR.
const uidDeviceFiles = [
  path.join(podsDir, 'expo-device', 'ios', 'UIDevice.swift'),
];

for (const file of uidDeviceFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('TARGET_OS_SIMULATOR')) {
    content = content.replace(
      /var isSimulator: Bool \{\n\s*return TARGET_OS_SIMULATOR != 0\n\s*\}/,
      `var isSimulator: Bool {\n#if targetEnvironment(simulator)\n    return true\n#else\n    return false\n#endif\n  }`
    );
    fs.writeFileSync(file, content);
    console.log('[patch-pods] Patched Pods UIDevice.swift');
  }
}

console.log('[patch-pods] Done');
