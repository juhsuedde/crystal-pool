import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";

/**
 * Listens for native deep links (e.g. crystalpool://auth/callback?...)
 * and forwards them into the React Router so OAuth callbacks resolve
 * inside the app instead of opening a browser tab.
 */
export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;

    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        // Strip the scheme + host, keep path + query + hash for the router
        const internalPath = `${url.pathname || "/"}${url.search}${url.hash}`;
        navigate(internalPath, { replace: true });
      } catch {
        // ignore malformed URLs
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, [navigate]);
};
