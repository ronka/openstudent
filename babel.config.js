module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            // Matches tsconfig's "@/*": ["./src/*", "./*"] - try src first, fall back to root
            // (gluestack-ui CLI output lives at repo root, everything else lives under src).
            '@': ['./src', './'],
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
