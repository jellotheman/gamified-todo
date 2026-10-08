import type AsyncStorage from '@react-native-async-storage/async-storage';
import 'firebase/auth';
import type { Persistence } from 'firebase/auth';

// Firebase's public declaration entry omits this React Native runtime export.
// Metro selects the SDK's react-native implementation on native platforms.
declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>,
  ): Persistence;
}
