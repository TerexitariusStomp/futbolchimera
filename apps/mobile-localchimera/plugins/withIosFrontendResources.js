const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');
const { execSync } = require('child_process');

const SOURCE_DIR = 'assets/frontend';
const TARGET_DIR = 'Resources';

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function withIosFrontendResources(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      const projectName = cfg.modRequest.projectName || 'LocalChimera';
      const srcDir = path.join(projectRoot, SOURCE_DIR);
      const destDir = path.join(iosDir, projectName, TARGET_DIR);

      if (!fs.existsSync(srcDir)) {
        throw new Error(`withIosFrontendResources: source dir not found: ${srcDir}`);
      }

      copyRecursive(srcDir, destDir);
      console.log(`[withIosFrontendResources] copied frontend assets to ${destDir}`);

      // Patch index.html: remove type="module" and crossorigin from script tags
      // WKWebView on iOS does not support ES module CORS for file:// URLs
      const indexHtmlPath = path.join(destDir, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        html = html.replace(/<script\s+type="module"\s+crossorigin/g, '<script');
        html = html.replace(/<script\s+type="module"/g, '<script');
        // Remove service worker registration (doesn't work with file:// URLs)
        html = html.replace(/<script>[\s\S]*?serviceWorker[\s\S]*?<\/script>/g, '');
        fs.writeFileSync(indexHtmlPath, html);
        console.log('[withIosFrontendResources] patched index.html: removed type="module" and crossorigin');
      }

      // Run script to add resources to Xcode project
      try {
        execSync('node scripts/add-ios-resources.js', {
          cwd: projectRoot,
          stdio: 'inherit',
        });
      } catch (e) {
        console.warn('[withIosFrontendResources] could not update Xcode project:', e.message);
      }

      return cfg;
    },
  ]);
}

module.exports = withIosFrontendResources;
