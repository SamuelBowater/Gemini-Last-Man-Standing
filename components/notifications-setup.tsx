"use client";

import { useEffect, useState } from "react";
import { GhostButton } from "@/components/ui";

const IOS_DISMISS_KEY = "ios-install-banner-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function NotificationsSetup({ loggedIn }: { loggedIn: boolean }) {
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ios = isIos();
    const standalone = isStandalone();
    const dismissed = localStorage.getItem(IOS_DISMISS_KEY) === "1";
    setShowIosBanner(ios && !standalone && !dismissed);

    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      (!ios || standalone);
    setPushSupported(supported);

    if (supported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {});
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismissIosBanner() {
    localStorage.setItem(IOS_DISMISS_KEY, "1");
    setShowIosBanner(false);
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function enableNotifications() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications were blocked — you can re-enable them in your browser settings.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your subscription.");
      }
      setSubscribed(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <>
      {showIosBanner && (
        <div className="bg-accent-soft border border-accent/30 text-accent rounded-xl px-4 py-3 mb-4 text-[13px] flex items-start justify-between gap-3">
          <span>
            📲 Add this to your Home Screen for the best experience (and to get notifications):
            tap the <strong>Share</strong> icon, then <strong>&quot;Add to Home Screen&quot;</strong>.
          </span>
          <button
            type="button"
            onClick={dismissIosBanner}
            aria-label="Dismiss"
            className="text-accent hover:opacity-70 leading-none text-base shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {installPrompt && (
        <div className="flex justify-end mb-2">
          <GhostButton className="px-3 py-1.5 text-[11px]" onClick={installApp}>
            📲 Install app
          </GhostButton>
        </div>
      )}

      {loggedIn && pushSupported && !subscribed && (
        <div className="flex justify-end mb-2 items-center gap-2">
          {error && <span className="text-red text-[11px]">{error}</span>}
          <GhostButton className="px-3 py-1.5 text-[11px]" onClick={enableNotifications} disabled={busy}>
            {busy ? "…" : "🔔 Enable notifications"}
          </GhostButton>
        </div>
      )}
    </>
  );
}
