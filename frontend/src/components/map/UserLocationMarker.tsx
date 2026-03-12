import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

interface UserLocationMarkerProps {
  position: [number, number];
  accuracy?: number;
}

// Inject pulse animation CSS for user location
const styleId = "user-loc-pulse";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes userLocPulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .user-loc-pulse {
      position: absolute;
      top: 50%; left: 50%;
      width: 20px; height: 20px;
      margin-top: -10px; margin-left: -10px;
      border-radius: 50%;
      background: rgba(59,130,246,0.4);
      animation: userLocPulse 1.5s ease-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:22px;height:22px;">
    <div class="user-loc-pulse"></div>
    <div style="position:relative;z-index:2;width:18px;height:18px;margin:2px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * Blue dot marker for the user's current location.
 */
export default function UserLocationMarker({ position, accuracy }: UserLocationMarkerProps) {
  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">Your Location</p>
          {accuracy != null && accuracy > 0 && (
            <p className="text-muted-foreground text-xs">Accuracy: ~{Math.round(accuracy)}m</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
