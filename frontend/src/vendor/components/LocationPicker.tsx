import { useEffect, useRef } from "react";
import L from "leaflet";

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange?: (radiusKm: number) => void;
}

export default function LocationPicker({
  latitude,
  longitude,
  serviceRadiusKm,
  onLocationChange,
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const callbackRef = useRef(onLocationChange);
  callbackRef.current = onLocationChange;

  const hasLocation = latitude !== 0 && longitude !== 0;
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: hasLocation ? [latitude, longitude] : defaultCenter,
      zoom: hasLocation ? 14 : 5,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      callbackRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    // Fix tiles not rendering fully on init
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker + circle when lat/lng change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old marker/circle
    if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
    if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }

    if (latitude && longitude) {
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:24px;height:24px;background:linear-gradient(135deg,#f97316,#ec4899);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-weight:bold;font-size:12px;">V</span></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
      circleRef.current = L.circle([latitude, longitude], {
        radius: serviceRadiusKm * 1000,
        color: "#f97316",
        fillColor: "#f97316",
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map);

      map.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude, serviceRadiusKm]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Click on the map to set your service location
      </p>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border"
        style={{ height: 300, zIndex: 0 }}
      />
      {hasLocation && (
        <p className="text-xs text-muted-foreground text-center">
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)} — {serviceRadiusKm} km radius
        </p>
      )}
    </div>
  );
}
