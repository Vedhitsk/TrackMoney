import { AppRegistry } from 'react-native';
import { processSmsBackground } from './lib/sms/smsIngestion';

// Register the Headless task IMMEDIATELY before any other logic.
// This ensures that when the app is killed and the native service starts the JS engine,
// the task is registered and ready to be called.
AppRegistry.registerHeadlessTask('BackgroundSmsTask', () => processSmsBackground);

// Now load the main Expo Router entry point.
import 'expo-router/entry';
