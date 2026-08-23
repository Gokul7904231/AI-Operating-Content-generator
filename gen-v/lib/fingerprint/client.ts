"use client";

import { useEffect, useState } from "react";
import FingerprintJS, { GetResult } from "@fingerprintjs/fingerprintjs";

let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;
let cachedVisitorId: string | null = null;

/**
 * Initializes and retrieves the client device fingerprint visitorId.
 * Safe for Next.js SSR / Client Component hydration.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    return "server_side_placeholder";
  }

  if (cachedVisitorId) {
    return cachedVisitorId;
  }

  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    const fp = await fpPromise;
    const result: GetResult = await fp.get();
    cachedVisitorId = result.visitorId;
    return result.visitorId;
  } catch (error) {
    console.warn("[FingerprintJS] Failed to get visitor identifier:", error);
    // Graceful fallback to persistent random client ID
    try {
      let localId = localStorage.getItem("factoryos_device_id");
      if (!localId) {
        localId = `dev_fallback_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("factoryos_device_id", localId);
      }
      cachedVisitorId = localId;
      return localId;
    } catch {
      return "ephemeral_client_id";
    }
  }
}

/**
 * React Hook for consuming the device fingerprint across FactoryOS UI.
 */
export function useDeviceFingerprint() {
  const [visitorId, setVisitorId] = useState<string | null>(cachedVisitorId);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedVisitorId);

  useEffect(() => {
    let isMounted = true;
    getDeviceFingerprint().then((id) => {
      if (isMounted) {
        setVisitorId(id);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { visitorId, isLoading };
}

/**
 * Helper to attach device fingerprint header to client fetch calls.
 */
export async function authenticatedFetchWithFingerprint(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const visitorId = await getDeviceFingerprint();
  const headers = new Headers(init?.headers);
  if (visitorId && !headers.has("x-device-fingerprint")) {
    headers.set("x-device-fingerprint", visitorId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
