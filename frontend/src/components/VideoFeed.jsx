"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export default function VideoFeed({ onStats }) {
  const imgRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ws;
    let cancelled = false;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          return;
        }
        if (imgRef.current && data.frame) {
          imgRef.current.src = `data:image/jpeg;base64,${data.frame}`;
        }
        onStats?.({
          objectCount: data.object_count ?? 0,
          breachCount: data.breach_count ?? 0,
        });
      };
    };

    connect();
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [onStats]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-700 shadow-lg bg-black aspect-[4/3]">
      <img
        ref={imgRef}
        alt="Live surveillance feed"
        className="w-full h-full object-cover"
      />
      <div
        className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full ${
          connected ? "bg-red-600 animate-pulse" : "bg-gray-600"
        }`}
      >
        ● {connected ? "LIVE" : "CONNECTING…"}
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <p className="text-red-400 text-sm text-center max-w-md">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
