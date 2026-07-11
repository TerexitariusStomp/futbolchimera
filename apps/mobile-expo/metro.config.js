const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support for .mjs and bare imports
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'bin', 'gguf'];

// Ensure large vendored bundles under node_modules are visible to Metro's file map
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, 'node_modules/@qvac/sdk/dist')];

// Alias missing @qvac/sdk internal dependency
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform, realModuleName) => {
  if (moduleName === '@qvac/rag/errors.js') {
    return { filePath: path.resolve(__dirname, 'stubs/qvac-rag-errors.js'), type: 'sourceFile' };
  }
  if (moduleName === 'tinyld/heavy') {
    return { filePath: path.resolve(__dirname, 'stubs/tinyld-heavy.js'), type: 'sourceFile' };
  }
  if (moduleName === '@qvac/sdk/dist/worker.mobile.bundle' || moduleName === '@qvac/sdk/worker.mobile.bundle') {
    return { filePath: path.resolve(__dirname, 'node_modules/@qvac/sdk/dist/worker.mobile.bundle.js'), type: 'sourceFile' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform, realModuleName);
  }
  return context.resolveRequest(context, moduleName, platform, realModuleName);
};

module.exports = config;
