import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { VendorMapData } from "./VendorMarkers";

interface MarkerClusterProps {
  vendors: VendorMapData[];
}

function createVendorIcon(rating?: number) {
  const badge =
    rating != null && rating > 0
      ? `<span style="position:absolute;top:-6px;right:-10px;background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:1px 3px;border-radius:6px;">${rating.toFixed(1)}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:28px;background:linear-gradient(135deg,#f97316,#ec4899);border-radius:50% 50% 50% 4px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-weight:bold;font-size:12px;">V</span>${badge}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

/**
 * Clusters vendor markers for performance with 1000+ vendors.
 * Uses leaflet.markercluster plugin.
 */
export default function MarkerCluster({ vendors }: MarkerClusterProps) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let size = "small";
        if (count > 50) size = "large";
        else if (count > 10) size = "medium";
        const sizes: Record<string, number> = { small: 36, medium: 44, large: 52 };
        const s = sizes[size];
        return L.divIcon({
          className: "",
          html: `<div style="width:${s}px;height:${s}px;background:linear-gradient(135deg,#f97316,#ec4899);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${s > 40 ? 14 : 12}px;">${count}</div>`,
          iconSize: [s, s],
          iconAnchor: [s / 2, s / 2],
        });
      },
    });

    vendors.forEach((v) => {
      const marker = L.marker([v.latitude, v.longitude], {
        icon: createVendorIcon(v.averageRating),
      });

      const cats = v.serviceCategories?.slice(0, 3).join(", ") ?? "";
      marker.bindPopup(`
        <div style="min-width:160px">
          <p style="font-weight:bold;font-size:13px;margin:0">${v.businessName}</p>
          <p style="font-size:11px;color:#888;margin:2px 0">
            ${v.averageRating && v.averageRating > 0 ? `⭐ ${v.averageRating.toFixed(1)} · ` : ""}${v.distanceKm.toFixed(1)} km
          </p>
          ${cats ? `<p style="font-size:11px;color:#aaa;margin:2px 0">${cats}</p>` : ""}
          <a href="/vendor/${v.vendorId}" style="display:inline-block;margin-top:6px;padding:4px 12px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">View & Book</a>
        </div>
      `);

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, vendors]);

  return null;
}
