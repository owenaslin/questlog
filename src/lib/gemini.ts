/**
 * Resolves the best available Gemini flash model at runtime by querying
 * Google's model-list API, so the app never needs a hardcoded model name.
 *
 * Selection criteria (in order):
 *  1. Supports generateContent
 *  2. Name contains "flash"
 *  3. Excludes "lite", "8b", and "-exp" variants (prefer stable, full-size)
 *  4. Sorted by major then minor version descending → newest wins
 *
 * Result is cached in-process for 24 hours. On any error the fallback is
 * returned immediately so generation is never blocked by a list failure.
 */

const FALLBACK_MODEL = "gemini-2.0-flash-lite";
const CACHE_TTL_MS   = 24 * 60 * 60 * 1000; // 24 h

let cachedModel: string | null = null;
let cacheExpiresAt              = 0;

interface GeminiModelEntry {
  name: string;
  supportedGenerationMethods?: string[];
}

/** Parse (major, minor) from "models/gemini-2.5-flash" → [2, 5] */
function parseFlashVersion(name: string): [number, number] {
  const m = name.match(/gemini-(\d+)\.(\d+)-flash/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [0, 0];
}

/**
 * Returns the name of the newest stable Gemini flash model available on the
 * account's API key, e.g. "gemini-2.5-flash". Cached for 24 h per process.
 */
export async function getLatestFlashModel(apiKey: string): Promise<string> {
  // Return cached value while still fresh.
  if (cachedModel && Date.now() < cacheExpiresAt) {
    return cachedModel;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5_000) });

    if (!res.ok) {
      console.warn(`[gemini] listModels returned ${res.status} — using fallback`);
      return FALLBACK_MODEL;
    }

    const data: { models?: GeminiModelEntry[] } = await res.json();
    const models = data.models ?? [];

    const candidates = models
      .filter(
        (m) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          m.name.includes("flash") &&
          !m.name.includes("8b")  &&   // skip tiny variants
          !m.name.includes("lite") &&  // prefer full-size
          !m.name.includes("-exp")     // prefer stable
      )
      .map((m) => m.name.replace("models/", ""))
      .sort((a, b) => {
        const [aMaj, aMin] = parseFlashVersion(a);
        const [bMaj, bMin] = parseFlashVersion(b);
        return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin; // descending
      });

    const best = candidates[0] ?? FALLBACK_MODEL;
    console.info(`[gemini] resolved latest flash model: ${best}`);

    cachedModel    = best;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return best;
  } catch (err) {
    console.warn("[gemini] model resolution failed — using fallback:", err);
    return FALLBACK_MODEL;
  }
}
