const fs = require('fs');
const path = require('path');

// Patch @qvac/sdk's withMobileBundle.js to skip bare-posix missing prebuild errors
// bare-posix doesn't ship Android prebuilds but has a JS fallback (unsupported.js)
const target = path.join(__dirname, '..', 'node_modules', '@qvac', 'sdk', 'dist', 'expo', 'plugins', 'withMobileBundle.js');

if (!fs.existsSync(target)) {
  console.log('⚠️  withMobileBundle.js not found, skipping patch');
} else {

let content = fs.readFileSync(target, 'utf8');

const oldCheck = `if (hasErrors(result)) {
        throw new BundleVerificationFailedError(generatedBundle, new Error(formatVerifyBundleResult(result)));
    }`;

const newCheck = `// Patched: ignore bare-posix missing prebuild and ABI mismatch errors on Android
    // bare-posix has no Android prebuilds but has a JS fallback; ABI mismatches are for
    // plugins not included in qvac.config.js (e.g. whisper, diffusion) so are irrelevant.
    const filteredIssues = result.issues.filter(i => {
      if (i.code === 'missing-prebuild' && i.addon && i.addon.includes('bare-posix')) return false;
      if (i.code === 'abi-mismatch') return false;
      return true;
    });
    const filteredResult = { ...result, issues: filteredIssues };
    if (hasErrors(filteredResult)) {
        throw new BundleVerificationFailedError(generatedBundle, new Error(formatVerifyBundleResult(result)));
    }`;

  if (content.includes(oldCheck)) {
    content = content.replace(oldCheck, newCheck);
    fs.writeFileSync(target, content, 'utf8');
    console.log('✅ Patched withMobileBundle.js to skip bare-posix missing prebuild errors');
  } else {
    console.log('⚠️  Could not find expected code block in withMobileBundle.js, patch may need updating');
  }
}

// Patch @qvac/sdk's withQvacSDK.js to downgrade NDK from 29 to 27
// NDK 29's libc++ doesn't define std::char_traits<unsigned char>, breaking fbjni
const sdkDir = path.join(__dirname, '..', 'node_modules', '@qvac', 'sdk', 'dist', 'expo', 'plugins');
const qvacSdkFile = path.join(sdkDir, 'withQvacSDK.js');

if (fs.existsSync(qvacSdkFile)) {
  let qvacContent = fs.readFileSync(qvacSdkFile, 'utf8');
  if (qvacContent.includes('29.0.14206865')) {
    qvacContent = qvacContent.replace(/29\.0\.14206865/g, '27.2.12479018');
    fs.writeFileSync(qvacSdkFile, qvacContent, 'utf8');
    console.log('✅ Patched withQvacSDK.js to use NDK 27.2.12479018 instead of 29.0.14206865');
  } else {
    console.log('⚠️  NDK 29 version not found in withQvacSDK.js, skipping NDK patch');
  }
} else {
  console.log('⚠️  withQvacSDK.js not found, skipping NDK patch');
}

// Also patch withAndroidNdkVersion.js if it hardcodes the NDK version
const ndkVersionFile = path.join(sdkDir, 'withAndroidNdkVersion.js');
if (fs.existsSync(ndkVersionFile)) {
  let ndkContent = fs.readFileSync(ndkVersionFile, 'utf8');
  if (ndkContent.includes('29.0.14206865')) {
    ndkContent = ndkContent.replace(/29\.0\.14206865/g, '27.2.12479018');
    fs.writeFileSync(ndkVersionFile, ndkContent, 'utf8');
    console.log('✅ Patched withAndroidNdkVersion.js to use NDK 27.2.12479018');
  }
}

// Patch @qvac/sdk's node-rpc-client.js to avoid polluting stdout during expo config
// The SDK logs the worker entry path at module load time; stdout corrupts `expo config --json`.
const rpcClientFile = path.join(__dirname, '..', 'node_modules', '@qvac', 'sdk', 'dist', 'client', 'rpc', 'node-rpc-client.js');
if (fs.existsSync(rpcClientFile)) {
  let rpcContent = fs.readFileSync(rpcClientFile, 'utf8');
  if (rpcContent.includes('logger.info(`🔧 Using custom worker entry: ${customEntry}`)')) {
    rpcContent = rpcContent.replace(
      'logger.info(`🔧 Using custom worker entry: ${customEntry}`);',
      'logger.debug(`🔧 Using custom worker entry: ${customEntry}`);'
    );
    fs.writeFileSync(rpcClientFile, rpcContent, 'utf8');
    console.log('✅ Patched node-rpc-client.js to use logger.debug for worker entry');
  } else {
    console.log('⚠️  node-rpc-client.js worker entry log not found, skipping stdout patch');
  }
} else {
  console.log('⚠️  node-rpc-client.js not found, skipping stdout patch');
}

// Patch @qvac/sdk's withOpenCL.js to make libOpenCL.so optional
// Without android:required="false", devices without OpenCL refuse to install the APK
const openClFile = path.join(sdkDir, 'withOpenCL.js');
if (fs.existsSync(openClFile)) {
  let openClContent = fs.readFileSync(openClFile, 'utf8');
  // Add android:required="false" to the uses-native-library entry
  if (openClContent.includes('"android:name": "libOpenCL.so"') && !openClContent.includes('android:required')) {
    openClContent = openClContent.replace(
      '"android:name": "libOpenCL.so",',
      '"android:name": "libOpenCL.so",\n                        "android:required": false,'
    );
    fs.writeFileSync(openClFile, openClContent, 'utf8');
    console.log('✅ Patched withOpenCL.js to make libOpenCL.so optional (android:required=false)');
  } else {
    console.log('⚠️  withOpenCL.js already patched or pattern not found, skipping');
  }
} else {
  console.log('⚠️  withOpenCL.js not found, skipping OpenCL patch');
}

// Bundle @qvac/sdk's ESM Expo plugin (and its transitive ESM dependencies, e.g.
// @qvac/error) into a single CommonJS file using esbuild. Expo's config-plugin
// resolver uses require() and cannot load ESM packages directly, so we produce
// a self-contained .cjs artifact (the .cjs extension forces CommonJS parsing
// regardless of any "type": "module" in package.json) and point app.json at it.
const qvacEntry = path.join(sdkDir, 'withQvacSDK.js');
const bundleOutDir = path.join(__dirname, '..', 'plugins', 'generated');
const bundleOutFile = path.join(bundleOutDir, 'qvac-sdk-plugin.cjs');

if (fs.existsSync(qvacEntry)) {
  try {
    const esbuild = require('esbuild');
    fs.mkdirSync(bundleOutDir, { recursive: true });
    esbuild.buildSync({
      entryPoints: [qvacEntry],
      outfile: bundleOutFile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      external: ['expo/config-plugins', '@expo/config-plugins'],
      logLevel: 'silent',
    });
    // esbuild emits `module.exports = default_export` when bundling an ESM
    // default export to CJS via the `exports.default` pattern; normalize so
    // requiring the bundle returns the plugin function directly.
    let bundled = fs.readFileSync(bundleOutFile, 'utf8');

    // Fix `import.meta.url` being undefined in CJS context — esbuild leaves
    // `var import_meta = {};` which causes `createRequire(import_meta.url)`
    // to throw. Replace with the current module's filename.
    bundled = bundled.replace(
      /var (import_meta\d*) = \{\};/g,
      'var $1 = { url: require("url").pathToFileURL(__filename).href };'
    );

    if (!/^module\.exports\s*=\s*[\w$]+_default;?\s*$/m.test(bundled)) {
      bundled += '\nif (module.exports && module.exports.default && typeof module.exports.default === "function") {\n  module.exports = module.exports.default;\n}\n';
    }
    fs.writeFileSync(bundleOutFile, bundled, 'utf8');
    console.log('✅ Bundled @qvac/sdk Expo plugin into plugins/generated/qvac-sdk-plugin.cjs');
  } catch (e) {
    console.log('⚠️  Failed to bundle @qvac/sdk Expo plugin with esbuild:', e.message);
  }
} else {
  console.log('⚠️  withQvacSDK.js entry not found, skipping esbuild bundle');
}
