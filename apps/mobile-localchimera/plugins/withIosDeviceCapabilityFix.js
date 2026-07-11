// Removes the arm64 UIRequiredDeviceCapabilities requirement added by the new architecture.
// This allows the iOS simulator build to run on both x86_64 and arm64 Appetize hosts.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

function removeArm64FromInfoPlist(infoPlistPath) {
  if (!fs.existsSync(infoPlistPath)) {
    console.log('[withIosDeviceCapabilityFix] Info.plist not found at', infoPlistPath);
    return false;
  }
  let content = fs.readFileSync(infoPlistPath, 'utf-8');
  if (!content.includes('<string>arm64</string>')) {
    console.log('[withIosDeviceCapabilityFix] No arm64 requirement found in Info.plist');
    return false;
  }
  // Remove the UIRequiredDeviceCapabilities block entirely
  content = content.replace(
    /\s*<key>UIRequiredDeviceCapabilities<\/key>\s*<array>[\s\S]*?<\/array>/,
    ''
  );
  fs.writeFileSync(infoPlistPath, content);
  console.log('[withIosDeviceCapabilityFix] Removed UIRequiredDeviceCapabilities arm64 block from Info.plist');
  return true;
}

console.log('[withIosDeviceCapabilityFix] Plugin module loaded');

function withIosDeviceCapabilityFix(config) {
  console.log('[withIosDeviceCapabilityFix] Applying plugin');
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      console.log('[withIosDeviceCapabilityFix] DangerousMod ios running, modRequest:', JSON.stringify(cfg.modRequest));
      const projectRoot = cfg.modRequest.projectRoot;
      const projectName = cfg.modRequest.projectName || 'LocalChimera';
      const infoPlistPath = path.join(projectRoot, 'ios', projectName, 'Info.plist');
      console.log('[withIosDeviceCapabilityFix] Target Info.plist:', infoPlistPath);
      removeArm64FromInfoPlist(infoPlistPath);
      return cfg;
    },
  ]);
}

module.exports = withIosDeviceCapabilityFix;
