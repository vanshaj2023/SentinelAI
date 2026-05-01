const API_URL = process.env.SENTINEL_API_URL || "http://localhost:8000";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "qwen/qwen3-32b";
const LLM_URL = `${LLM_BASE_URL}/chat/completions`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_alerts",
      description:
        "Returns recent zone-breach alerts as an array. Prefer get_alerts_stats for counting questions — only use this when you need raw events. Each alert has id, track_id, label, confidence, timestamp.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Max alerts to return (default 20, hard cap 50).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts_stats",
      description:
        "Returns aggregate stats: total_alerts, unique_tracks, by_class (count per object class), unique_tracks_by_class. Use this for 'how many', 'which class', counting questions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts_in_window",
      description:
        "Returns alerts filtered by ISO time window and/or class label. Results are capped at 50 events — for high-level summaries, prefer get_alerts_stats or get_alerts_timeline instead.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO timestamp lower bound" },
          end: { type: "string", description: "ISO timestamp upper bound" },
          label: { type: "string", description: "Object class filter, e.g. 'person'" },
          limit: { type: "integer", description: "Max events (default 20, hard cap 50)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts_timeline",
      description:
        "Returns alert counts bucketed by time. Each item: { timestamp, count, by_class }. Use for trend / over-time questions.",
      parameters: {
        type: "object",
        properties: {
          bucket_seconds: {
            type: "integer",
            description: "Bucket size in seconds (default 60).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_zone",
      description:
        "Returns the currently configured restricted zone rectangle (x1,y1,x2,y2,label) on the 640x480 frame.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function capArray(arr, limit) {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= limit) return arr;
  return {
    items: arr.slice(0, limit),
    truncated: true,
    returned: limit,
    total_matching: arr.length,
    note: `Result truncated to ${limit} items. Use get_alerts_stats for aggregates instead of listing all events.`,
  };
}

async function executeTool(name, args) {
  try {
    if (name === "get_alerts") {
      const limit = Math.min(Math.max(parseInt(args.limit ?? 20, 10) || 20, 1), 50);
      const r = await fetch(`${API_URL}/alerts?limit=${limit}`, { cache: "no-store" });
      const data = await r.json();
      return capArray(data, limit);
    }
    if (name === "get_alerts_stats") {
      const r = await fetch(`${API_URL}/alerts/stats`, { cache: "no-store" });
      return await r.json();
    }
    if (name === "get_alerts_in_window") {
      const limit = Math.min(Math.max(parseInt(args.limit ?? 20, 10) || 20, 1), 50);
      const qs = new URLSearchParams();
      if (args.start) qs.set("start", args.start);
      if (args.end) qs.set("end", args.end);
      if (args.label) qs.set("label", args.label);
      const r = await fetch(`${API_URL}/alerts/window?${qs}`, { cache: "no-store" });
      const data = await r.json();
      return capArray(data, limit);
    }
    if (name === "get_alerts_timeline") {
      const b = parseInt(args.bucket_seconds ?? 60, 10) || 60;
      const r = await fetch(`${API_URL}/alerts/timeline?bucket_seconds=${b}`, {
        cache: "no-store",
      });
      const data = await r.json();
      return capArray(data, 30);
    }
    if (name === "get_zone") {
      const r = await fetch(`${API_URL}/zone`, { cache: "no-store" });
      return await r.json();
    }
    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    return { error: `Tool ${name} failed: ${e.message}` };
  }
}

const SYSTEM_PROMPT = `You are SentinelAI, an AI surveillance analyst for a defence-grade monitoring system.
You have access to tools that query a live database of zone-breach events from a YOLOv8 + ByteTrack pipeline.

Operating rules:
- Answer with concrete numbers and evidence from tools — do not guess.
- For counting, "which class", "how many" questions: prefer get_alerts_stats first.
- For "last N minutes / today / between X and Y": use get_alerts_in_window with ISO timestamps.
- IMPORTANT: If a time-windowed query returns zero events, ALSO call get_alerts_stats and get_alerts (limit 5) so you can tell the user (a) the total events on record, (b) when the most recent activity was. Never report "no activity" without checking the wider history first.
- Be terse, factual, military-style. Use bullets over prose. Cite class, track id, timestamp.
- When listing rankings (e.g. dominant classes), always sort by count descending.
- The current restricted zone configuration is operational context — do not include it unless the user asks about zones.

Current time: ${new Date().toISOString()}.`;

export async function POST(request) {
  const { question } = await request.json().catch(() => ({}));
  if (!question || typeof question !== "string") {
    return Response.json({ error: "Missing 'question' string" }, { status: 400 });
  }
  if (!LLM_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY (or LLM_API_KEY) not set on the server." },
      { status: 500 },
    );
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for (let step = 0; step < 6; step++) {
          const res = await fetch(LLM_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LLM_API_KEY}`,
            },
            body: JSON.stringify({
              model: LLM_MODEL,
              messages,
              tools: TOOLS,
              tool_choice: "auto",
              max_tokens: 1024,
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            send({ type: "error", error: `LLM ${res.status}: ${text.slice(0, 400)}` });
            controller.close();
            return;
          }

          const data = await res.json();
          const msg = data.choices?.[0]?.message;
          if (!msg) {
            send({ type: "error", error: "No message in response" });
            controller.close();
            return;
          }

          if (msg.tool_calls && msg.tool_calls.length > 0) {
            messages.push(msg);
            for (const tc of msg.tool_calls) {
              const rawName = tc.function?.name || "";
              const fname = rawName.split("<|")[0].trim();
              let fargs = {};
              try {
                fargs = JSON.parse(tc.function?.arguments || "{}");
              } catch {}
              send({ type: "tool_call", name: fname, args: fargs });
              const result = await executeTool(fname, fargs);
              send({ type: "tool_result", name: fname, ok: !result?.error });
              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
            continue;
          }

          const cleaned = (msg.content || "").replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
          send({ type: "text", content: cleaned });
          send({ type: "done" });
          controller.close();
          return;
        }
        send({ type: "error", error: "Tool-call loop limit reached." });
        controller.close();
      } catch (e) {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "error", error: e.message }) + "\n"),
          );
        } catch {}
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
