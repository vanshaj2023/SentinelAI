const API_URL = process.env.SENTINEL_API_URL || "http://localhost:8000";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "qwen/qwen3-32b";
const LLM_URL = `${LLM_BASE_URL}/chat/completions`;

const ZONE_SYSTEM = `You translate natural-language descriptions of a restricted zone into a JSON rectangle for a 640x480 video frame.

Coordinate system:
- Origin (0,0) is top-left.
- x grows right (max 640). y grows down (max 480).
- Frame is divided conceptually into thirds: left (0-213), centre (213-427), right (427-640); top (0-160), middle (160-320), bottom (320-480).

Output ONLY a valid JSON object, no prose, with this exact shape:
{ "x1": int, "y1": int, "x2": int, "y2": int, "label": "<short uppercase label, max 30 chars>" }

Constraints: 0 <= x1 < x2 <= 640, 0 <= y1 < y2 <= 480.
If user gives no usable spatial info, default to a centre rectangle (160,120,480,360) with a sensible label.

/no_think`;

export async function POST(request) {
  const { description } = await request.json().catch(() => ({}));
  if (!description) {
    return Response.json({ error: "Missing 'description'" }, { status: 400 });
  }
  if (!LLM_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY (or LLM_API_KEY) not set on the server." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 400,
        temperature: 0,
        messages: [
          { role: "system", content: ZONE_SYSTEM },
          { role: "user", content: description },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: `LLM ${res.status}: ${t.slice(0, 400)}` }, { status: 502 });
    }
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : cleaned;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: "LLM returned invalid JSON", raw }, { status: 502 });
    }

    const cfg = {
      x1: Math.max(0, Math.min(640, parseInt(parsed.x1, 10))),
      y1: Math.max(0, Math.min(480, parseInt(parsed.y1, 10))),
      x2: Math.max(0, Math.min(640, parseInt(parsed.x2, 10))),
      y2: Math.max(0, Math.min(480, parseInt(parsed.y2, 10))),
      label: (parsed.label || "RESTRICTED ZONE").toString().slice(0, 30),
    };
    if (!(cfg.x2 > cfg.x1 && cfg.y2 > cfg.y1)) {
      return Response.json({ error: "Invalid coordinates from LLM", cfg }, { status: 502 });
    }

    const putRes = await fetch(`${API_URL}/zone`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!putRes.ok) {
      const t = await putRes.text();
      return Response.json({ error: `Backend rejected zone: ${t}` }, { status: 502 });
    }
    const applied = await putRes.json();
    return Response.json({ applied, interpreted: cfg });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
