"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ZoneConfig() {
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const examples = [
    "Cover the entire bottom half — vehicle approach lane",
    "A tight box in the upper-left corner — guard post",
    "Centre of the frame — main gate",
  ];

  useEffect(() => {
    fetch(`${API_URL}/zone`)
      .then((r) => r.json())
      .then(setZone)
      .catch(() => {});
  }, []);

  const apply = async (desc = description) => {
    if (!desc.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/configure-zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setZone(data.applied);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mt-4">
      <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-3">
        ◌ Zone Config (Natural Language)
      </h2>

      <div className="flex gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder='e.g. "the gate area on the right side"'
          className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => apply()}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "…" : "Apply"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {examples.map((e) => (
          <button
            key={e}
            onClick={() => {
              setDescription(e);
              apply(e);
            }}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-amber-400 bg-gray-800 rounded-md px-2 py-1 disabled:opacity-50"
          >
            {e}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {zone && (
        <div className="text-xs text-gray-400 mt-3 font-mono">
          <span className="text-amber-400">active:</span> {zone.label} ·
          ({zone.x1},{zone.y1}) → ({zone.x2},{zone.y2})
        </div>
      )}
    </div>
  );
}
