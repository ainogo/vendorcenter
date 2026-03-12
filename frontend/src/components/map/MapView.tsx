import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";

// Fix Leaflet default icon URLs broken by bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  children?: React.ReactNode;
  onMapReady?: (map: LeafletMap) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

/** Fires onMapReady when the Leaflet map instance is available */
function MapReadyHandler({ onMapReady }: { onMapReady?: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

/** Smoothly flies the map to a new center when it changes */
function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);
  useEffect(() => {
    if (
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1] ||
      prevZoom.current !== zoom
    ) {
      map.flyTo(center, zoom, { duration: 1.2 });
      prevCenter.current = center;
      prevZoom.current = zoom;
    }
  }, [map, center, zoom]);
  return null;
}

/** Handles map click events to pick a location */
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Reusable map wrapper using Leaflet + OpenStreetMap (free, no API key).
 * Renders children as map layers (markers, polygons, etc.)
 */
export default function MapView({
  center = [20.5937, 78.9629], // Default: center of India
  zoom = 12,
  className = "w-full h-[500px] rounded-xl overflow-hidden",
  children,
  onMapReady,
  onMapClick,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className={className}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToCenter center={center} zoom={zoom} />
      <MapReadyHandler onMapReady={onMapReady} />
      <MapClickHandler onMapClick={onMapClick} />
      {children}
    </MapContainer>
  );
}
