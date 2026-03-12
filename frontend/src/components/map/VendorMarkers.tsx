import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";

export interface VendorMapData {
  vendorId: string;
  businessName: string;
  zone: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  averageRating?: number;
  totalReviews?: number;
  serviceCategories?: string[];
}

// Inject pulse animation CSS once
const styleId = "vendor-marker-pulse";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes vendorPulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.8); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    .vendor-pulse-ring {
      position: absolute;
      top: 50%; left: 50%;
      width: 36px; height: 36px;
      margin-top: -18px; margin-left: -18px;
      border-radius: 50%;
      background: rgba(249,115,22,0.35);
      animation: vendorPulse 2s ease-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function createVendorIcon(rating?: number) {
  const ratingBadge =
    rating != null && Number(rating) > 0
      ? `<span style="position:absolute;top:-8px;right:-12px;background:#16a34a;color:white;font-size:9px;font-weight:700;padding:2px 5px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.3);">★ ${Number(rating).toFixed(1)}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:40px;height:40px;">
      <div class="vendor-pulse-ring"></div>
      <div style="position:relative;z-index:2;width:40px;height:40px;background:linear-gradient(135deg,#f97316,#ec4899);border-radius:50% 50% 50% 4px;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
      </div>
      ${ratingBadge}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
  });
}

interface VendorMarkersProps {
  vendors: VendorMapData[];
}

/**
 * Renders vendor markers on the map with popups showing name, rating, distance and book button.
 * Uses Ola/Uber-style animated pulse markers.
 */
export default function VendorMarkers({ vendors }: VendorMarkersProps) {
  return (
    <>
      {vendors.map((v) => (
        <Marker
          key={v.vendorId}
          position={[v.latitude, v.longitude]}
          icon={createVendorIcon(v.averageRating)}
        >
          <Popup>
            <div className="min-w-[200px]">
              <p className="font-bold text-sm">{v.businessName}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                {v.averageRating != null && Number(v.averageRating) > 0 && (
                  <span className="flex items-center gap-0.5 bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                    ★ {Number(v.averageRating).toFixed(1)}
                    {v.totalReviews != null && <span className="text-green-600 ml-0.5">({v.totalReviews})</span>}
                  </span>
                )}
                <span className="text-gray-400">•</span>
                <span>{Number(v.distanceKm).toFixed(1)} km</span>
              </div>
              {v.serviceCategories && v.serviceCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {v.serviceCategories.slice(0, 3).map((cat) => (
                    <span key={cat} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">📍 {v.zone}</p>
              <Link
                to={`/vendor/${v.vendorId}`}
                className="mt-2 inline-block w-full text-center text-xs font-semibold py-2 px-3 rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
              >
                View & Book →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
