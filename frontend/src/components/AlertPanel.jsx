"use client";
import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/alerts`);
        const data = await res.json();
        if (!cancelled) {
          setAlerts(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 h-[28rem] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
          ⚠ Zone Breach Log
        </h2>
        <span className="text-gray-500 text-xs">{alerts.length} events</span>
      </div>

      {error && (
        <p className="text-yellow-500 text-xs mb-2">
          Backend offline: {error}
        </p>
      )}

      {alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">No breaches detected.</p>
      ) : (
        alerts.map((alert, i) => (
          <div
            key={`${alert.track_id}-${alert.timestamp}-${i}`}
            className="flex justify-between items-center bg-red-950 border border-red-800 rounded-lg px-3 py-2 mb-2"
          >
            <div>
              <span className="text-red-400 font-bold text-sm">
                ID #{alert.track_id}
              </span>
              <span className="text-gray-300 text-xs ml-2 capitalize">
                {alert.label}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                {(alert.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-gray-500 text-xs">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
