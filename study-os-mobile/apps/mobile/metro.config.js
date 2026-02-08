// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'txt', 'html', 'css' to assetExts
config.resolver.assetExts.push('txt', 'html', 'css');

module.exports = config;
