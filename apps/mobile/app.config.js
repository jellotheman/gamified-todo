// The explicit runtime selector controls app identity independently of Git/NODE_ENV.
module.exports = ({ config }) => {
  const environment = process.env.EXPO_PUBLIC_APP_ENV;
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
  };
};
