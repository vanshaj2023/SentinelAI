"use client";
import { useState } from "react";
import Markdown from "@/components/Markdown";

const TOOL_LABELS = {
  get_alerts: "fetching recent alerts",
  get_alerts_stats: "computing breach statistics",
  get_alerts_in_window: "querying time window",
  get_alerts_timeline: "building timeline",
  get_zone: "reading zone config",
};

export default function QueryBox() {
  const [query, setQuery] = useState("");
  const [trace, setTrace] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const examples = [
    "How many vehicles entered the zone?",
    "Which object class triggered the most breaches?",
    "Summarise breach activity in the last 5 minutes.",
  ];

  const handleQuery = async (q = query) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setTrace([]);
    setAnswer("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok || !res.body) {
        const t = await res.text();
        setAnswer(`Error: ${t || res.statusText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "tool_call") {
              setTrace((t) => [...t, { kind: "call", name: evt.name, args: evt.args }]);
            } else if (evt.type === "tool_result") {
              setTrace((t) => [...t, { kind: "result", name: evt.name, ok: evt.ok }]);
            } else if (evt.type === "text") {
              setAnswer(evt.content || "");
            } else if (evt.type === "error") {
              setAnswer(`Error: ${evt.error}`);
            }
          } catch {}
        }
      }
    } catch (e) {
      setAnswer(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mt-4">
      <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-3">
        ✦ AI Analyst (Agent · Tool Use)
      </h2>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuery()}
          placeholder='Ask anything about the breach log…'
          className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => handleQuery()}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {examples.map((e) => (
          <button
            key={e}
            onClick={() => {
              setQuery(e);
              handleQuery(e);
            }}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-blue-400 bg-gray-800 rounded-md px-2 py-1 disabled:opacity-50"
          >
            {e}
          </button>
        ))}
      </div>

      {trace.length > 0 && (
        <div className="mt-3 space-y-1">
          {trace.map((t, i) => (
            <div key={i} className="text-xs font-mono text-gray-500">
              {t.kind === "call" ? (
                <>
                  <span className="text-blue-400">→ tool</span>{" "}
                  <span className="text-gray-300">{t.name}</span>{" "}
                  <span className="text-gray-600">
                    ({TOOL_LABELS[t.name] || "running"})
                  </span>
                </>
              ) : (
                <>
                  <span className={t.ok ? "text-green-500" : "text-red-500"}>
                    ← {t.ok ? "ok" : "error"}
                  </span>{" "}
                  <span className="text-gray-400">{t.name}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {answer && (
        <div className="mt-3 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <Markdown>{answer}</Markdown>
        </div>
      )}
    </div>
  );
}
