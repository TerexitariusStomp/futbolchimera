// Patches expo-device UIDevice.swift for Xcode 26 / Swift 6 compatibility.
// TARGET_OS_SIMULATOR is a C preprocessor macro and is not available in Swift,
// causing "cannot find 'TARGET_OS_SIMULATOR' in scope". Use Swift's
// targetEnvironment(simulator) instead.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'expo-device', 'ios', 'UIDevice.swift');
if (!fs.existsSync(file)) {
  console.log('[patch-expo-device] UIDevice.swift not found');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf-8');
if (content.includes('TARGET_OS_SIMULATOR')) {
  content = content.replace(
    /var isSimulator: Bool \{\n\s*return TARGET_OS_SIMULATOR != 0\n\s*\}/,
    `var isSimulator: Bool {\n#if targetEnvironment(simulator)\n    return true\n#else\n    return false\n#endif\n  }`
  );
  fs.writeFileSync(file, content);
  console.log('[patch-expo-device] Patched UIDevice.swift: TARGET_OS_SIMULATOR -> targetEnvironment(simulator)');
} else {
  console.log('[patch-expo-device] UIDevice.swift already patched or no TARGET_OS_SIMULATOR found');
}

const after = fs.readFileSync(file, 'utf-8');
if (after.includes('TARGET_OS_SIMULATOR')) {
  console.error('[patch-expo-device] ERROR: TARGET_OS_SIMULATOR still present in UIDevice.swift');
  process.exit(1);
}
console.log('[patch-expo-device] Done');
