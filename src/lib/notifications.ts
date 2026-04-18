import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const PUSH_TOKEN_KEY = "cp.push_token";
const REMINDER_DAYS_KEY = "cp.reminder_days";

const isMobile = () => Capacitor.isNativePlatform();

export const requestPushPermissions = async (): Promise<boolean> => {
  if (!isMobile()) return false;
  try {
    const result = await PushNotifications.requestPermissions() as { receive?: string };
    return result.receive === "granted";
  } catch {
    return false;
  }
};

export const registerPushToken = async (): Promise<string | null> => {
  if (!isMobile()) return null;
  try {
    await PushNotifications.register();
  } catch {
    return null;
  }
  return null;
};

export const getPushToken = async (): Promise<string | null> => {
  if (!isMobile()) return null;
  try {
    const token = await (PushNotifications as any).getToken();
    if (token?.value) {
      localStorage.setItem(PUSH_TOKEN_KEY, token.value);
      return token.value;
    }
  } catch {}
  return localStorage.getItem(PUSH_TOKEN_KEY);
};

export const removePushToken = async (): Promise<void> => {
  try {
    await (PushNotifications as any).unregister();
  } catch {}
  localStorage.removeItem(PUSH_TOKEN_KEY);
};

export const addPushListener = (
  event: "pushNotificationActionPerformed",
  callback: (notification: { notification: { title?: string; body?: string; data?: Record<string, unknown> } }) => void
) => {
  return (PushNotifications as any).addListener(event, callback);
};

export const setReminderDays = (days: number | null): void => {
  if (days === null) {
    localStorage.removeItem(REMINDER_DAYS_KEY);
  } else {
    localStorage.setItem(REMINDER_DAYS_KEY, String(days));
  }
};

export const getReminderDays = (): number | null => {
  const val = localStorage.getItem(REMINDER_DAYS_KEY);
  return val ? parseInt(val, 10) : null;
};

export const scheduleReadingReminder = async (poolName: string, daysFromNow: number): Promise<void> => {
  if (!isMobile()) return;
  if (daysFromNow <= 0) return;

  const notif = {
    id: 1,
    title: `Check your pool: ${poolName}`,
    body: "It's been a while since your last reading. Tap to log your pool status.",
    schedule: { at: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000) },
  };

  try {
    await LocalNotifications.schedule({ notifications: [notif] });
  } catch (err) {
    console.error("Failed to schedule reminder:", err);
  }
};

export const cancelAllReminders = async (): Promise<void> => {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch {}
  setReminderDays(null);
};

export const requestLocalPermissions = async (): Promise<boolean> => {
  try {
    const result = await LocalNotifications.requestPermissions() as { receive?: string };
    return result.receive === "granted";
  } catch {
    return false;
  }
};