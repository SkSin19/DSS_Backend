// Thin wrapper over the Gemini REST API (no SDK dependency).
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.1-flash-lite";
// Used only when the main model is overloaded (503) or times out.
export const FALLBACK_CHAT_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
export const EMBED_DIMENSIONS = 768;

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return key;
};

const callGemini = async (path, body, { timeoutMs = 30000 } = {}) => {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": getApiKey() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${data?.error?.message || "request failed"}`);
  }
  return data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embeds up to 100 texts in one call. taskType is RETRIEVAL_DOCUMENT for the
 * knowledge base and RETRIEVAL_QUERY for user questions. With `retries`, waits
 * out per-minute quota errors (the free tier allows 100 embeddings a minute).
 */
export const embedTexts = async (texts, taskType, { retries = 0 } = {}) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await callGemini(`models/${EMBED_MODEL}:batchEmbedContents`, {
        requests: texts.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBED_DIMENSIONS,
        })),
      });
      return data.embeddings.map((e) => e.values);
    } catch (error) {
      if (attempt >= retries || !error.message.startsWith("Gemini 429")) throw error;
      const wait = Number(error.message.match(/retry in ([\d.]+)s/)?.[1] ?? 60);
      console.log(`Rate limited; waiting ${Math.ceil(wait)}s…`);
      await sleep((wait + 2) * 1000);
    }
  }
};

export const embedQuery = async (text) => (await embedTexts([text], "RETRIEVAL_QUERY"))[0];

/** messages: [{ role: "user" | "model", text }] */
export const generateReply = async ({ systemPrompt, messages }) => {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
  };

  // Gemini sometimes returns 503 "high demand": retry once, then use the fallback model.
  const attempts = [CHAT_MODEL, CHAT_MODEL, FALLBACK_CHAT_MODEL];
  for (let i = 0; ; i++) {
    try {
      const data = await callGemini(`models/${attempts[i]}:generateContent`, body, { timeoutMs: 20000 });
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
      return { text: text || "", usage: data?.usageMetadata };
    } catch (error) {
      const transient = /^Gemini (500|503)/.test(error.message) || error.name === "TimeoutError";
      if (!transient || i === attempts.length - 1) throw error;
      console.warn(`Chat model ${attempts[i]} unavailable (${error.message}); retrying.`);
      if (i === 0) await sleep(1500);
    }
  }
};
