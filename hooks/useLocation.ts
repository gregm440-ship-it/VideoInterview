import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { LatLng } from "../lib/places";

type Status = "idle" | "loading" | "granted" | "denied" | "error";

// Sensible default so the app is useful even before a fix / on denial (Austin).
export const FALLBACK_LOCATION: LatLng = { lat: 30.2672, lng: -97.7431 };

export function useLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const request = useCallback(async () => {
    try {
      setStatus("loading");
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setStatus("granted");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void request();
  }, [request]);

  // Always hand callers a usable point — real fix when we have it, else fallback.
  return {
    location: location ?? FALLBACK_LOCATION,
    hasFix: location != null,
    status,
    request,
  };
}
