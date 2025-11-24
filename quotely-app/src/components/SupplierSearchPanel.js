import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { label: "🔧 Mechanic", value: "car_repair", tagType: "shop" },
  { label: "🚿 Plumber", value: "plumber", tagType: "craft" },
  { label: "⚡ Electrician", value: "electrician", tagType: "craft" },
  { label: "🎨 Painter", value: "painter", tagType: "craft" },
  { label: "🧹 Cleaner", value: "cleaning", tagType: "craft" },
  { label: "🍽️ Catering", value: "caterer", tagType: "craft" },
  { label: "🏗️ Builder", value: "builder", tagType: "craft" },
  { label: "🔨 Carpenter", value: "carpenter", tagType: "craft" },
  { label: "🔌 HVAC", value: "hvac", tagType: "craft" },
];

// Compact Location Input
function LocationInput({ onLocationSelect, selectedLocation }) {
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortCtrlRef = useRef(null);

  useEffect(() => {
    if (inputText.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(
          inputText
        )}&limit=5`;
        const response = await fetch(url, {
          signal: abortCtrlRef.current.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch suggestions");
        const data = await response.json();
        setSuggestions(data || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Error loading suggestions");
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
    };
  }, [inputText]);

  const handleSelect = (place) => {
    const displayName = place.display_name.split(",").slice(0, 2).join(",");
    setInputText(displayName);
    setSuggestions([]);
    setError(null);
    onLocationSelect({
      name: displayName,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setError(null);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to reverse geocode");
          const data = await res.json();
          const displayName =
            data.display_name.split(",").slice(0, 2).join(",") ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setInputText(displayName);
          setSuggestions([]);
          onLocationSelect({
            name: displayName,
            lat: latitude,
            lon: longitude,
          });
        } catch {
          setError("Could not determine address");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Permission denied");
        setLoading(false);
      }
    );
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        📍 Location
      </label>
      <div className="flex gap-1.5 mb-1.5">
        <input
          type="text"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter city..."
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={loading}
          className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
        >
          📍
        </button>
      </div>
      {loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {selectedLocation && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Location set
        </p>
      )}
      {!loading && suggestions.length > 0 && (
        <ul className="absolute z-50 w-[350px] max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shadow-lg mt-1">
          {suggestions.map((place) => (
            <li
              key={place.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              onClick={() => handleSelect(place)}
            >
              <div className="font-medium text-gray-800 dark:text-white truncate">
                {place.display_name.split(",")[0]}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {place.display_name.split(",").slice(1, 3).join(",")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Main Component
export default function SupplierSearchPanel() {
  const [location, setLocation] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([
    CATEGORIES[0].value,
  ]);
  const [radius, setRadius] = useState(10000);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const searchSuppliers = async () => {
    setError(null);
    setSuppliers([]);
    setHasSearched(true);

    if (!location?.lat || !location?.lon) {
      setError("Please select a valid location");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Please select at least one category");
      return;
    }

    setLoading(true);

    try {
      const categoriesByType = CATEGORIES.filter((c) =>
        selectedCategories.includes(c.value)
      ).reduce((acc, cat) => {
        if (!acc[cat.tagType]) acc[cat.tagType] = [];
        acc[cat.tagType].push(cat.value);
        return acc;
      }, {});

      const blocks = Object.entries(categoriesByType)
        .map(([tagType, values]) =>
          values
            .map(
              (val) => `
          node["${tagType}"="${val}"](around:${radius},${location.lat},${location.lon});
          way["${tagType}"="${val}"](around:${radius},${location.lat},${location.lon});
          relation["${tagType}"="${val}"](around:${radius},${location.lat},${location.lon});`
            )
            .join("\n")
        )
        .join("\n");

      const query = `[out:json][timeout:30];(${blocks});out body center;`;

      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        query
      )}`;
      const overpassRes = await fetch(overpassUrl);

      if (!overpassRes.ok) {
        throw new Error(`Overpass API error: ${overpassRes.status}`);
      }

      const overpassData = await overpassRes.json();

      if (!overpassData.elements || overpassData.elements.length === 0) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const seen = new Set();
      const formattedSuppliers = overpassData.elements
        .filter((el) => {
          if (!el.tags?.name) return false;
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          const key = `${el.tags.name}-${lat}-${lon}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((el) => {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;

          const distance =
            lat && lon
              ? Math.round(
                  Math.sqrt(
                    Math.pow((lat - location.lat) * 111000, 2) +
                      Math.pow(
                        (lon - location.lon) *
                          111000 *
                          Math.cos((location.lat * Math.PI) / 180),
                        2
                      )
                  ) / 100
                ) / 10
              : null;

          return {
            key: el.id,
            name: el.tags.name,
            address:
              [el.tags["addr:street"], el.tags["addr:city"]]
                .filter(Boolean)
                .join(", ") || "Address N/A",
            phone: el.tags.phone || el.tags["contact:phone"] || null,
            website: el.tags.website || el.tags["contact:website"] || null,
            lat,
            lon,
            distance,
          };
        })
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));

      setSuppliers(formattedSuppliers);
    } catch (e) {
      console.error("Search error:", e);
      setError("Search failed. Please try again.");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 h-fit">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        🔍 Find Suppliers
      </h3>

      <LocationInput
        onLocationSelect={setLocation}
        selectedLocation={location}
      />

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          🏷️ Categories
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggleCategory(cat.value)}
              className={`px-2.5 py-1.5 text-xs rounded border transition-all ${
                selectedCategories.includes(cat.value)
                  ? "bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          📏 Radius: {(radius / 1000).toFixed(0)} km
        </label>
        <input
          type="range"
          min={1}
          max={50}
          value={radius / 1000}
          onChange={(e) => setRadius(e.target.value * 1000)}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-0.5">
          <span>1km</span>
          <span>50km</span>
        </div>
      </div>

      <button
        onClick={searchSuppliers}
        disabled={loading || !location || selectedCategories.length === 0}
        className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "🔄 Searching..." : "🔍 Search"}
      </button>

      {hasSearched && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
              <p className="text-xs text-red-700 dark:text-red-200">
                ⚠️ {error}
              </p>
            </div>
          )}

          {!loading && !error && suppliers.length === 0 && (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">😔</div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                No suppliers found
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Try increasing radius
              </p>
            </div>
          )}

          {suppliers.length > 0 && (
            <>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Found {suppliers.length} supplier
                  {suppliers.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {suppliers.map((sup) => (
                  <div
                    key={sup.key}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow transition-all bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white flex-1 leading-tight">
                        {sup.name}
                      </h4>
                      {sup.distance && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold whitespace-nowrap">
                          {sup.distance}km
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                        <span>📍</span>
                        <span className="flex-1 leading-tight">
                          {sup.address}
                        </span>
                      </div>

                      {sup.phone && (
                        <div className="flex items-center gap-1.5">
                          <span>📞</span>
                          <a
                            href={`tel:${sup.phone}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            {sup.phone}
                          </a>
                        </div>
                      )}

                      {sup.website && (
                        <div className="flex items-center gap-1.5">
                          <span>🌐</span>
                          <a
                            href={sup.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate"
                          >
                            Website →
                          </a>
                        </div>
                      )}

                      {sup.lat && sup.lon && (
                        <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${sup.lat}&mlon=${sup.lon}&zoom=16`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            🗺️ View Map →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
