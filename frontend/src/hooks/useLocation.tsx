import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getUserLocation, reverseGeocode, type UserLocation } from "@/services/locationService";

interface LocationContextValue {
  location: UserLocation | null;
  cityName: string;
  fullAddress: string;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setManualLocation: (lat: number, lng: number) => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [cityName, setCityName] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(() => {
    setLoading(true);
    setError(null);
    getUserLocation()
      .then(async (loc) => {
        setLocation(loc);
        try {
          const addr = await reverseGeocode(loc.latitude, loc.longitude);
          setFullAddress(addr);
          // Extract city from address parts
          const parts = addr.split(",").map((s) => s.trim());
          // Typically city is 3rd or 4th from end in Nominatim
          const city = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
          setCityName(city);
        } catch {
          setCityName("Your Location");
          setFullAddress(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
        }
      })
      .catch((err) => {
        setError(err.message || "Location unavailable");
        setCityName("");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  const setManualLocation = useCallback(async (lat: number, lng: number) => {
    const loc: UserLocation = { latitude: lat, longitude: lng, accuracy: 0 };
    setLocation(loc);
    setError(null);
    try {
      const addr = await reverseGeocode(lat, lng);
      setFullAddress(addr);
      const parts = addr.split(",").map((s) => s.trim());
      setCityName(parts.length >= 3 ? parts[parts.length - 3] : parts[0]);
    } catch {
      setCityName("Selected Location");
      setFullAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{ location, cityName, fullAddress, loading, error, refresh: detect, setManualLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
