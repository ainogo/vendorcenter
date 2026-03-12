import { useState, useEffect, useCallback } from "react";
import { getUserLocation, type UserLocation, type LocationError } from "@/services/locationService";

interface UseUserLocationResult {
  location: UserLocation | null;
  error: { code: LocationError; message: string } | null;
  loading: boolean;
  refresh: () => void;
  setManualLocation: (lat: number, lng: number) => void;
}

/**
 * React hook that wraps the location service.
 * Auto-fetches on mount. Provides manual override for fallback.
 */
export function useUserLocation(autoFetch = true): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<{ code: LocationError; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    getUserLocation()
      .then((loc) => {
        setLocation(loc);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (autoFetch) fetch();
  }, [autoFetch, fetch]);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setLocation({ latitude: lat, longitude: lng, accuracy: 0 });
    setError(null);
  }, []);

  return { location, error, loading, refresh: fetch, setManualLocation };
}
