const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
const projectName = (appJson.expo.name || 'LocalChimera').replace(/[^a-zA-Z0-9]/g, '');

const srcDir = path.join(projectRoot, 'assets/frontend');
const androidAssetsDir = path.join(projectRoot, 'android/app/src/main/assets');
const iosAssetsDir = path.join(projectRoot, 'ios', projectName, 'Resources');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * vite-plugin-singlefile inlines the JS bundle in the <head>. For mobile
 * WebView loads (file://) the script executes before the <div id="root">
 * exists, so React never mounts. Move the inline module script to the end of
 * <body> right after the root div, keeping the bundle inline so file:// module
 * issues are avoided.
 */
function fixSingleFileHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  const htmlDir = path.dirname(filePath);
  let html = fs.readFileSync(filePath, 'utf8');

  // Inline external CSS <link rel="stylesheet" href="./assets/...">
  html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']\.\/([^"']+)["'][^>]*>/gi, (match, href) => {
    const cssPath = path.join(htmlDir, href);
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf8');
      return '<style>\n' + css + '\n</style>';
    }
    return match;
  });

  // Inline external module scripts: <script type="module" crossorigin src="./assets/...">
  // Also handle regular scripts with src. Use string search instead of regex for large files.
  let scriptSearchIdx = 0;
  while (true) {
    const scriptStart = html.indexOf('<script', scriptSearchIdx);
    if (scriptStart === -1) break;
    const scriptTagEnd = html.indexOf('>', scriptStart);
    if (scriptTagEnd === -1) break;
    const scriptCloseTag = html.indexOf('</script>', scriptTagEnd);
    if (scriptCloseTag === -1) { scriptSearchIdx = scriptTagEnd + 1; continue; }

    const scriptTag = html.slice(scriptStart, scriptTagEnd + 1);
    const srcMatch = scriptTag.match(/\ssrc=["']\.\/([^"']+)["']/i);
    if (!srcMatch) { scriptSearchIdx = scriptCloseTag + 9; continue; }

    const href = srcMatch[1];
    const jsPath = path.join(htmlDir, href);
    if (!fs.existsSync(jsPath)) { scriptSearchIdx = scriptCloseTag + 9; continue; }

    const js = fs.readFileSync(jsPath, 'utf8');
    // Build new script tag: remove crossorigin, keep type="module"
    let newTag = scriptTag.replace(/\s*crossorigin/gi, '').replace(/\s*src=["'][^"']*["']/gi, '');
    // Remove trailing slash if any
    newTag = newTag.replace(/\s*\/>$/, '>');
    if (!newTag.endsWith('>')) newTag += '>';
    const replacement = newTag + '\n' + js + '\n</script>';
    html = html.slice(0, scriptStart) + replacement + html.slice(scriptCloseTag + 9);
    scriptSearchIdx = scriptStart + replacement.length;
  }

  // Note: We don't move inline module scripts to after the root div because
  // ES modules defer by default, and large inlined JS may contain </script>
  // strings that break string-based searching.

  // Remove manifest and service worker references that don't work with file://
  html = html.replace(/<link[^>]*rel=["']manifest["'][^>]*>/gi, '');
  html = html.replace(/<script[^>]*>\s*if\s*\(\s*['"]serviceWorker['"]\s*in\s*navigator[\s\S]*?<\/script>/gi, '');

  fs.writeFileSync(filePath, html);
  console.log('Inlined and fixed HTML for mobile WebView:', filePath);
}

if (!fs.existsSync(srcDir)) {
  console.error('Frontend assets not found:', srcDir);
  console.error('Restore from git: git checkout 5b3469d -- apps/mobile-localchimera/assets/frontend/');
  process.exit(1);
}

// Copy to Android native assets directory (create if missing).
// This is required for the files to be included in the APK as raw assets.
copyRecursive(srcDir, androidAssetsDir);
console.log('Frontend assets copied to Android assets:', androidAssetsDir);

// Fix single-file HTML ordering for mobile WebView.
fixSingleFileHtml(path.join(androidAssetsDir, 'index.html'));

// Copy to iOS bundle resources if ios/ project exists
if (fs.existsSync(path.join(__dirname, '../ios'))) {
  copyRecursive(srcDir, iosAssetsDir);
  fixSingleFileHtml(path.join(iosAssetsDir, 'index.html'));
  console.log('Frontend assets copied to iOS resources:', iosAssetsDir);

  // Add files to Xcode project
  try {
    require('child_process').execSync('node scripts/add-ios-resources.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch (e) {
    console.warn('Could not update Xcode project:', e.message);
  }
}
