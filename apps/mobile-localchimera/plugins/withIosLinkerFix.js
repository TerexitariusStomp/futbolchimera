const { withXcodeProject } = require('@expo/config-plugins');

function withIosLinkerFix(config) {
  return withXcodeProject(config, async (cfg) => {
    const project = cfg.modResults;
    const target = project.getFirstTarget().firstTarget;

    // Xcode pbxproj stores build settings as objects keyed by build config name
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const bc = configs[key];
      if (bc.buildSettings && bc.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        let existing = bc.buildSettings.OTHER_LDFLAGS;
        if (Array.isArray(existing)) {
          if (!existing.includes('-ld_classic')) {
            existing.push('-ld_classic');
          }
        } else if (typeof existing === 'string') {
          if (!existing.includes('-ld_classic')) {
            bc.buildSettings.OTHER_LDFLAGS = existing + ' -ld_classic';
          }
        } else {
          bc.buildSettings.OTHER_LDFLAGS = ['"$(inherited)"', '-ld_classic'];
        }
      }
    }

    console.log('[withIosLinkerFix] Added -ld_classic to OTHER_LDFLAGS');
    return cfg;
  });
}

module.exports = withIosLinkerFix;
