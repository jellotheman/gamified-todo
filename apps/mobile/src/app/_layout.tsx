import { FrontendProvider } from '../components/frontend';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '../lib/firebase';
import { runDevelopmentSmokeCheck } from '../lib/development-smoke';

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__ && process.env.EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE === 'true') {
      void runDevelopmentSmokeCheck().then(
        (result) => console.info('Development smoke check passed', result),
        (error: unknown) => console.error('Development smoke check failed', error),
      );
    }
  }, []);
  return (
    <FrontendProvider>
      <Slot />
      <StatusBar style="light" />
    </FrontendProvider>
  );
}
