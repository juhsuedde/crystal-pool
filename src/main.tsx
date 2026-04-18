import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const initNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;
  const { requestPushPermissions, registerPushToken, getPushToken, addPushListener } = await import("@/lib/notifications");
  await requestPushPermissions();
  await registerPushToken();
  await getPushToken();
  addPushListener("pushNotificationActionPerformed", (notif) => {
    console.log("Push tapped:", notif.notification.title);
  });
};

initNotifications();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);
