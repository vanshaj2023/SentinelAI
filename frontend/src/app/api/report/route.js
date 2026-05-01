const API_URL = process.env.SENTINEL_API_URL || "http://localhost:8000";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "qwen/qwen3-32b";
const LLM_URL = `${LLM_BASE_URL}/chat/completions`;

const REPORT_SYSTEM = `You are a defence-grade incident report writer for SentinelAI.
Produce a structured Markdown after-action report from the supplied alert and stats data.
Strictly follow this section layout:

# SentinelAI Incident Report

**Generated:** <ISO timestamp>
**Reporting period:** <first alert ts> → <last alert ts>
**Operator:** SentinelAI (autonomous)

## 1. Executive Summary
A 2-3 sentence operational overview.

## 2. Key Metrics
- Total breach events
- Unique tracked entities
- Breach distribution by class (bullet list)

## 3. Notable Events
Up to 5 highest-confidence or anomalous events. For each: time, class, track ID, confidence.

## 4. Pattern Analysis
Spikes, clusters, dominant classes, time-of-day notes — based ONLY on the provided data.

## 5. Recommended Actions
2-4 bullets of operationally useful next steps (e.g. patrol increase, sensor review, gate hardening).

Rules: be terse, factual, military-style. Never fabricate data. If the dataset is empty, state that clearly and skip irrelevant sections.`;

export async function POST(request) {
  if (!LLM_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY (or LLM_API_KEY) not set on the server." },
      { status: 500 },
    );
  }

  try {
    const [alertsRes, statsRes, zoneRes] = await Promise.all([
      fetch(`${API_URL}/alerts?limit=30`, { cache: "no-store" }),
      fetch(`${API_URL}/alerts/stats`, { cache: "no-store" }),
      fetch(`${API_URL}/zone`, { cache: "no-store" }),
    ]);
    const alerts = await alertsRes.json();
    const stats = await statsRes.json();
    const zone = await zoneRes.json();

    const userPayload = JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        zone,
        stats,
        alerts,
      },
      null,
      2,
    );

    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 1500,
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          {
            role: "user",
            content: `Generate the report from this dataset:\n\n${userPayload}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: `LLM ${res.status}: ${t.slice(0, 400)}` }, { status: 502 });
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "# Empty report";
    const markdown = raw.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
    return Response.json({ markdown, alert_count: alerts.length, stats });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
