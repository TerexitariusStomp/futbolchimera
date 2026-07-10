// Removes the arm64 UIRequiredDeviceCapabilities requirement added by the new architecture.
// This allows the iOS simulator build to run on both x86_64 and arm64 Appetize hosts.
const { withInfoPlist } = require('@expo/config-plugins');

function withIosDeviceCapabilityFix(config) {
  return withInfoPlist(config, (cfg) => {
    const infoPlist = cfg.modResults;
    if (infoPlist.UIRequiredDeviceCapabilities) {
      const caps = infoPlist.UIRequiredDeviceCapabilities;
      if (Array.isArray(caps) && caps.includes('arm64')) {
        infoPlist.UIRequiredDeviceCapabilities = caps.filter(c => c !== 'arm64');
        if (infoPlist.UIRequiredDeviceCapabilities.length === 0) {
          delete infoPlist.UIRequiredDeviceCapabilities;
        }
        console.log('[withIosDeviceCapabilityFix] Removed arm64 requirement from UIRequiredDeviceCapabilities');
      } else if (typeof caps === 'object' && caps['arm64'] !== undefined) {
        delete caps['arm64'];
        if (Object.keys(caps).length === 0) {
          delete infoPlist.UIRequiredDeviceCapabilities;
        }
        console.log('[withIosDeviceCapabilityFix] Removed arm64 requirement from UIRequiredDeviceCapabilities');
      }
    }
    return cfg;
  });
}

module.exports = withIosDeviceCapabilityFix;
