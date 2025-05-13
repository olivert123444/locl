module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add other plugins here if you have them, but reanimated must be last.
      'react-native-reanimated/plugin', // This plugin MUST be listed last.
    ],
  };
};
