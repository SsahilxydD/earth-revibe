import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api-client';

// Foreground notifications: show banner + play sound. Without this they
// fire silently when the user has the app open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push doesn't work on simulators / emulators (Expo limitation).
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'New orders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0a0a0a',
      sound: 'default',
    });
  }

  // EAS sets EXPO_PUBLIC_PROJECT_ID automatically; for local dev we read
  // it from app.json's `extra.eas.projectId` if present.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_PROJECT_ID;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResponse.data;
}

/**
 * Register the device's Expo push token with the API. Idempotent — the
 * server upserts on token uniqueness, so calling this on every cold start
 * after login is safe (and recommended, in case the OS rotated the token).
 */
export async function registerDeviceWithApi(expoPushToken: string) {
  await api.post('/auth/devices', {
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: Constants.expoConfig?.version,
  });
}

export async function unregisterDeviceWithApi(expoPushToken: string) {
  try {
    await api.delete(`/auth/devices/${encodeURIComponent(expoPushToken)}`);
  } catch {
    // Best-effort. If the request fails (network down, token already gone),
    // the server's `DeviceNotRegistered` cleanup will catch it eventually.
  }
}
