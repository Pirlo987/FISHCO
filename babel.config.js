module.exports = function (api) {
  api.cache(true);

  // Prefer the new worklets plugin if available; fall back to Reanimated's.
  let reanimatedPlugin = 'react-native-reanimated/plugin';
  try {
    // Will resolve only if react-native-worklets is installed
    reanimatedPlugin = require.resolve('react-native-worklets/plugin');
  } catch (e) {}

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // Must be last per Reanimated docs
      reanimatedPlugin,
    ],
  };
};
