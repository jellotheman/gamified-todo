// EAS profiles set the environment; Expo Go defaults to development.
module.exports = ({ config }) => {
  const environment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
  if (!['development', 'production'].includes(environment)) {
    throw new Error('EXPO_PUBLIC_APP_ENV must be development or production.');
  }
  const development = environment === 'development';
  return {
    ...config,
    name: development ? 'Gamified Todo Dev' : 'Gamified Todo',
    scheme: development ? 'gamifiedtodo-dev' : 'gamifiedtodo',
    android: { ...config.android, package: development ? 'com.gamifiedtodo.app.dev' : 'com.gamifiedtodo.app' },
    ios: { ...config.ios, bundleIdentifier: development ? 'com.gamifiedtodo.app.dev' : 'com.gamifiedtodo.app' },
    runtimeVersion: { policy: 'fingerprint' },
    updates: { url: 'https://u.expo.dev/54af575f-8e7b-465c-8bde-ca68b52ff92e' },
  };
};
