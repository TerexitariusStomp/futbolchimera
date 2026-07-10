// Patches react-native-bare-kit for React Native 0.76 compatibility.
// The BareKitPackage.java in the package uses the old 6-arg ReactModuleInfo
// constructor. In RN 0.76 the 7-arg constructor is required, with the last
// boolean isTurboModule. Without it, RN treats BareKit as a plain native
// module, calls getModule("BareKit") which returns null, and crashes with a
// NullPointerException. The react-native.config.js also points to a missing
// root CMakeLists.txt; the Android CMakeLists is under android/CMakeLists.txt.
// We also keep the getEnforcing -> get change so the JS layer can gracefully
// degrade if the TurboModule is still unavailable.
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'node_modules', 'react-native-bare-kit');

// 1. Patch NativeBareKit.ts: getEnforcing -> get (returns null instead of throwing)
const specsFile = path.join(baseDir, 'specs', 'NativeBareKit.ts');
if (fs.existsSync(specsFile)) {
  let content = fs.readFileSync(specsFile, 'utf-8');
  if (content.includes('getEnforcing')) {
    content = content.replace('TurboModuleRegistry.getEnforcing', 'TurboModuleRegistry.get');
    fs.writeFileSync(specsFile, content);
    console.log('[patch-bare-kit] Patched NativeBareKit.ts: getEnforcing -> get');
  } else {
    console.log('[patch-bare-kit] NativeBareKit.ts already patched or no getEnforcing found');
  }
} else {
  console.log('[patch-bare-kit] NativeBareKit.ts not found');
}

// 2. Patch BareKitPackage.java to use the 7-arg ReactModuleInfo constructor.
// BareKit is a C++ TurboModule, so isCxxModule must be true and isTurboModule
// must be true. The original 6-arg constructor is ambiguous in RN 0.76 and
// can cause RN to call getModule() on a null Java module, producing the NPE.
const javaFile = path.join(baseDir, 'android', 'src', 'main', 'java', 'to', 'holepunch', 'bare', 'kit', 'react', 'BareKitPackage.java');
if (fs.existsSync(javaFile)) {
  let content = fs.readFileSync(javaFile, 'utf-8');
  const correctMarker = '__patched_7arg_cxx_turbo';
  if (!content.includes(correctMarker)) {
    // Replace either the original 6-arg form or the previously-patched 7-arg
    // form that incorrectly set isCxxModule=false.
    content = content.replace(
      'map.put(NAME, new ReactModuleInfo(NAME, NAME, false, false, true, true));',
      'map.put(NAME, new ReactModuleInfo(NAME, NAME, false, false, true, true, true)); // ' + correctMarker
    );
    content = content.replace(
      'map.put(NAME, new ReactModuleInfo(NAME, NAME, false, false, true, false, true)); // __patched_7arg',
      'map.put(NAME, new ReactModuleInfo(NAME, NAME, false, false, true, true, true)); // ' + correctMarker
    );
    fs.writeFileSync(javaFile, content);
    console.log('[patch-bare-kit] Patched BareKitPackage.java: isCxxModule=true, isTurboModule=true');
  } else {
    console.log('[patch-bare-kit] BareKitPackage.java already patched');
  }
} else {
  console.log('[patch-bare-kit] BareKitPackage.java not found');
}

// 3. Patch react-native.config.js to point to the Android CMakeLists.txt.
// The autolinker resolves cxxModuleCMakeListsPath relative to the package's
// android sourceDir, so the correct relative path is 'CMakeLists.txt' (the
// file is already at android/CMakeLists.txt). Using 'android/CMakeLists.txt'
// produces a double 'android/android/CMakeLists.txt' path and prevents the
// C++ TurboModule from being registered, leading to the BareKit NPE.
const configFile = path.join(baseDir, 'react-native.config.js');
if (fs.existsSync(configFile)) {
  let content = fs.readFileSync(configFile, 'utf-8');
  if (!content.includes("cxxModuleCMakeListsPath: 'CMakeLists.txt'")) {
    content = content.replace(
      "cxxModuleCMakeListsPath: 'android/CMakeLists.txt'",
      "cxxModuleCMakeListsPath: 'CMakeLists.txt'"
    );
    fs.writeFileSync(configFile, content);
    console.log('[patch-bare-kit] Patched react-native.config.js: CMakeLists path -> CMakeLists.txt');
  } else {
    console.log('[patch-bare-kit] react-native.config.js already patched or path differs');
  }
} else {
  console.log('[patch-bare-kit] react-native.config.js not found');
}

// 4. Patch iOS BareKitModuleProvider.h to remove RCTModuleProvider protocol
// RN 0.76 does not define RCTModuleProvider protocol, causing Xcode build failure.
// The class still works as a module provider without the protocol declaration.
const iosProviderHeader = path.join(baseDir, 'ios', 'BareKitModuleProvider.h');
if (fs.existsSync(iosProviderHeader)) {
  let content = fs.readFileSync(iosProviderHeader, 'utf-8');
  if (content.includes('RCTModuleProvider')) {
    // Remove the protocol declaration with optional whitespace, e.g. < RCTModuleProvider >
    content = content.replace(/<\s*RCTModuleProvider\s*>/g, '');
    fs.writeFileSync(iosProviderHeader, content);
    console.log('[patch-bare-kit] Patched BareKitModuleProvider.h: removed RCTModuleProvider protocol');
  } else {
    console.log('[patch-bare-kit] BareKitModuleProvider.h already patched or no RCTModuleProvider found');
  }
  const after = fs.readFileSync(iosProviderHeader, 'utf-8');
  if (after.includes('RCTModuleProvider')) {
    console.error('[patch-bare-kit] ERROR: RCTModuleProvider still present in BareKitModuleProvider.h');
    process.exit(1);
  }
} else {
  console.log('[patch-bare-kit] BareKitModuleProvider.h not found');
}

// 5. Patch iOS BareKitModuleProvider.mm to remove RCTModuleProvider import and
// protocol methods that don't exist in RN 0.76.
const iosProviderImpl = path.join(baseDir, 'ios', 'BareKitModuleProvider.mm');
if (fs.existsSync(iosProviderImpl)) {
  let content = fs.readFileSync(iosProviderImpl, 'utf-8');
  let changed = false;
  if (content.includes('#import <ReactCommon/RCTModuleProvider.h>')) {
    content = content.replace('#import <ReactCommon/RCTModuleProvider.h>\n', '');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(iosProviderImpl, content);
    console.log('[patch-bare-kit] Patched BareKitModuleProvider.mm: removed RCTModuleProvider import');
  } else {
    console.log('[patch-bare-kit] BareKitModuleProvider.mm already patched or no RCTModuleProvider import found');
  }
} else {
  console.log('[patch-bare-kit] BareKitModuleProvider.mm not found');
}

console.log('[patch-bare-kit] Done');
