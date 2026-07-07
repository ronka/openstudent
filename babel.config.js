module.exports = function (api) {
  // nativewind/babel's transform breaks Expo Router's server-side HTML prerender
  // (web.output: "server" always prerenders pages, even though this app doesn't need
  // SSR/web styling) - skip it only for that server bundle; native/client-web keep it.
  const isServer = api.caller((caller) => caller?.isServer ?? false);
  api.cache.using(() => isServer);

  return {
    presets: [['babel-preset-expo'], ...(isServer ? [] : ['nativewind/babel'])],

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
