const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure .webp images are bundled by Metro
const { assetExts } = config.resolver;
if (!assetExts.includes('webp')) {
  config.resolver.assetExts = [...assetExts, 'webp'];
}

module.exports = withNativeWind(config, { input: "./global.css" });
