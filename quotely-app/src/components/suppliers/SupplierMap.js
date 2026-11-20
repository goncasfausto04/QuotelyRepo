// OpenStreetMap with one marker per supplier. Click a marker to select it.

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supplierKey } from "./suppliersApi.js";

const EUROPE = [48, 5];

// Zoom to fit every marker whenever the results change
function FitBounds({ points, center }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
    else if (points.length === 1) map.setView(points[0], 12);
    else if (center) map.setView([center.lat, center.lng], 10);
  }, [map, points, center]);
  return null;
}

export default function SupplierMap({ suppliers, center, selected, focused, onToggle, onFocus }) {
  const located = suppliers.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const points = located.map((s) => [s.lat, s.lng]);

  return (
    <div className="h-80 sm:h-[28rem] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
      <MapContainer center={center ? [center.lat, center.lng] : EUROPE} zoom={center ? 10 : 4} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} center={center} />
        {located.map((s) => {
          const key = supplierKey(s);
          const isSelected = selected.has(key);
          const canSend = !!s.contact_email;
          return (
            <CircleMarker
              key={key}
              center={[s.lat, s.lng]}
              radius={focused === key ? 13 : 10}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillOpacity: 0.95,
                fillColor: isSelected ? "#16a34a" : canSend ? "#2563eb" : "#9ca3af",
              }}
              eventHandlers={{ click: () => onFocus(key) }}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[180px]">
                  <div className="font-semibold">{s.name}</div>
                  {s.address && <div className="text-gray-600">{s.address}</div>}
                  {s.approximate && <div className="text-xs text-amber-600">Approximate location (city)</div>}
                  {canSend ? (
                    <button
                      onClick={() => onToggle(s)}
                      className={`mt-1 w-full px-2 py-1 rounded text-white ${isSelected ? "bg-gray-500" : "bg-green-600"}`}
                    >
                      {isSelected ? "Remove from request" : "Add to request"}
                    </button>
                  ) : (
                    <div className="text-xs text-amber-700">No email found{s.website ? ", check the website" : ""}</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {suppliers.length > 0 && located.length === 0 && (
        <div className="absolute inset-x-0 bottom-0 m-2 p-2 rounded bg-white/90 text-xs text-gray-700 text-center z-[400]">
          Couldn't place these suppliers on the map (no address found).
        </div>
      )}
    </div>
  );
}
