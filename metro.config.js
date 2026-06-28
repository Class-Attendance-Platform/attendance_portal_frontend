const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure metro resolver includes all necessary extensions
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'];

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
