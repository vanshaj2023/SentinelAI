"use client";
import { useState } from "react";
import VideoFeed from "@/components/VideoFeed";
import StatsBar from "@/components/StatsBar";
import AlertPanel from "@/components/AlertPanel";
import QueryBox from "@/components/QueryBox";
import IncidentReport from "@/components/IncidentReport";
import ZoneConfig from "@/components/ZoneConfig";

export default function Home() {
  const [stats, setStats] = useState({ objectCount: 0, breachCount: 0 });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SentinelAI</h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-Time Surveillance · Tool-Using AI Analyst · Auto Reports
            </p>
          </div>
          <div className="text-xs text-gray-500 hidden sm:block">
            YOLOv8 · ByteTrack · FastAPI · xAI Grok
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VideoFeed onStats={setStats} />
            <StatsBar
              objectCount={stats.objectCount}
              breachCount={stats.breachCount}
            />
            <QueryBox />
            <ZoneConfig />
            <IncidentReport />
          </div>

          <div>
            <AlertPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
