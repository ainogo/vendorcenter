import { Polygon, Popup } from "react-leaflet";

export interface ZoneData {
  id: string;
  name: string;
  city: string;
  polygonCoordinates: [number, number][];
  active: boolean;
}

interface ZoneLayerProps {
  zones: ZoneData[];
  highlightActiveZone?: string | null;
}

const ACTIVE_STYLE = { color: "#22c55e", weight: 2, fillColor: "#22c55e", fillOpacity: 0.1 };
const INACTIVE_STYLE = { color: "#94a3b8", weight: 1, fillColor: "#94a3b8", fillOpacity: 0.05, dashArray: "5,5" };
const HIGHLIGHT_STYLE = { color: "#f97316", weight: 3, fillColor: "#f97316", fillOpacity: 0.15 };

/**
 * Renders zone polygons on the map.
 * Active zones are green, inactive are gray dashed, highlighted zone is orange.
 */
export default function ZoneLayer({ zones, highlightActiveZone }: ZoneLayerProps) {
  return (
    <>
      {zones
        .filter((z) => z.polygonCoordinates && z.polygonCoordinates.length >= 3)
        .map((z) => {
          let style = z.active ? ACTIVE_STYLE : INACTIVE_STYLE;
          if (highlightActiveZone === z.id) style = HIGHLIGHT_STYLE;

          return (
            <Polygon key={z.id} positions={z.polygonCoordinates} pathOptions={style}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{z.name}</p>
                  <p className="text-xs text-gray-500">{z.city}</p>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      z.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {z.active ? "Active" : "Coming Soon"}
                  </span>
                </div>
              </Popup>
            </Polygon>
          );
        })}
    </>
  );
}
