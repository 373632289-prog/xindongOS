const SYSTEM_PROMPT = `You convert natural language visual direction into xindongOS visual parameters.
Return only JSON with these keys:
style: one of harmonic, aura, silk, crystal, pulse, veil
theme: one of cyan, magenta, amber, lime, aether, violet
complexity: integer 2-12
speed: integer 10-140
glow: integer 15-100
density: integer 80-520
sensitivity: integer 20-180
summary: short Chinese phrase under 24 characters.`;

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeIntent(intent) {
  const styles = new Set(["harmonic", "aura", "silk", "crystal", "pulse", "veil"]);
  const themes = new Set(["cyan", "magenta", "amber", "lime", "aether", "violet"]);
  return {
    style: styles.has(intent.style) ? intent.style : "aura",
    theme: themes.has(intent.theme) ? intent.theme : "aether",
    complexity: clamp(intent.complexity, 2, 12),
    speed: clamp(intent.speed, 10, 140),
    glow: clamp(intent.glow, 15, 100),
    density: clamp(intent.density, 80, 520),
    sensitivity: clamp(intent.sensitivity, 20, 180),
    summary: String(intent.summary || "视觉已生成").slice(0, 24),
  };
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function onRequestPost({ request, env }) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!env.MODEL_API_URL || !env.MODEL_API_KEY) {
      return Response.json({ error: "MODEL_API_URL and MODEL_API_KEY are not configured" }, { status: 501 });
    }

    const response = await fetch(env.MODEL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MODEL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.MODEL_NAME || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "Model request failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || data.output_text || "";
    return Response.json({ intent: normalizeIntent(extractJson(text)) });
  } catch (error) {
    return Response.json({ error: error.message || "Visual intent failed" }, { status: 500 });
  }
}
