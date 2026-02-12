import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

type Suggestion = {
  species: string;
  confidence: number;
  matched?: boolean;
  source?: "database" | "ai";
  unmatched?: boolean;
};

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.1";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const JSON_FORMAT =
  '{"primary":{"species":"Nom exact de la liste","confidence":98},"alternatives":[{"species":"Deuxieme option","confidence":55},{"species":"Troisieme option","confidence":38}]}';

const buildPrompt = (speciesNames: string[]) => {
  const list = speciesNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
  return (
    `Tu es expert en identification de poissons.\n` +
    `Voici la liste EXHAUSTIVE des especes disponibles :\n${list}\n\n` +
    `REGLES :\n` +
    `- Tu DOIS choisir UNIQUEMENT parmi les especes de cette liste.\n` +
    `- Utilise le nom EXACT tel qu'il apparait dans la liste (orthographe, accents, parentheses).\n` +
    `- Si le poisson ressemble a plusieurs especes de la liste, classe-les par confiance.\n` +
    `- Si le poisson ne correspond a AUCUNE espece de la liste meme de loin, retourne "unknown" comme nom d'espece avec une confiance de 0.\n` +
    `- La confiance est toujours un pourcentage entier entre 0 et 100.\n\n` +
    `Reponds uniquement avec du JSON : ${JSON_FORMAT}`
  );
};

// Fallback si la BDD est indisponible
const FALLBACK_PROMPT =
  "Tu es expert pour trouver l'espece de poisson. Analyse la photo fournie et reponds uniquement avec du JSON ayant la forme suivante : " +
  JSON_FORMAT +
  " . La confiance est toujours un pourcentage entier entre 0 et 100.";

const jsonResponse = (payload: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

const sanitizeImageInput = (value: string) => {
  if (!value) return null;
  if (value.startsWith("data:")) return value;
  return `data:image/jpeg;base64,${value}`;
};

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "X-Client-Info": "fishco-detect-species" } },
      })
    : null;

const extractTextFromResponse = (payload: any): string => {
  if (typeof payload?.output_text === "string") return payload.output_text;
  if (Array.isArray(payload?.output)) {
    for (const block of payload.output) {
      if (typeof block?.text === "string") return block.text;
      if (Array.isArray(block?.content)) {
        const joined = block.content
          .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
          .filter(Boolean)
          .join("\n");
        if (joined.trim()) return joined;
      }
    }
  }
  return "";
};

const extractSpeciesLabel = (row: Record<string, unknown>) => {
  const raw =
    (typeof row.name === "string" && row.name) ||
    (typeof row.french_name === "string" && row.french_name) ||
    (typeof row.english_name === "string" && row.english_name) ||
    (typeof row["Nom commun"] === "string" && row["Nom commun"]) ||
    (typeof row["nom commun"] === "string" && row["nom commun"]) ||
    (typeof row.nom === "string" && row.nom) ||
    (typeof row.label === "string" && row.label) ||
    (typeof row.title === "string" && row.title) ||
    "";
  return raw.trim();
};

const loadSpeciesDirectory = async (): Promise<Map<string, string> | null> => {
  if (!supabase) {
    console.warn("Supabase client not configured, skipping DB match");
    return null;
  }
  const { data, error } = await supabase.from("species").select("*");
  if (error || !Array.isArray(data)) {
    console.error("Unable to load species table", error);
    return null;
  }
  const directory = new Map<string, string>();
  for (const row of data) {
    const label = extractSpeciesLabel(row as Record<string, unknown>);
    const key = normalizeName(label);
    if (!label || !key) continue;
    if (!directory.has(key)) directory.set(key, label);
  }
  return directory;
};

const matchAgainstDirectory = (
  value: string,
  directory?: Map<string, string> | null,
): string | null => {
  if (!value || !directory?.size) return null;
  const normalized = normalizeName(value);
  const direct = directory.get(normalized);
  if (direct) return direct;
  for (const [key, label] of directory.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return label;
    }
  }
  return null;
};

const pushSuggestion = (target: Suggestion[], entry: Record<string, unknown> | undefined) => {
  if (!entry) return;
  const rawLabel =
    typeof entry.species === "string"
      ? entry.species
      : typeof entry.name === "string"
      ? entry.name
      : typeof entry.label === "string"
      ? entry.label
      : typeof entry.espece === "string"
      ? entry.espece
      : typeof entry.option === "string"
      ? entry.option
      : typeof entry.title === "string"
      ? entry.title
      : "";
  const species = rawLabel.trim();
  if (!species) return;

  let confidenceRaw =
    typeof entry.confidence === "number"
      ? entry.confidence
      : typeof entry.confidence === "string"
      ? parseFloat(entry.confidence.replace("%", ""))
      : typeof entry.percentage === "number"
      ? entry.percentage
      : typeof entry.percentage === "string"
      ? parseFloat(entry.percentage.replace("%", ""))
      : typeof entry.percent === "number"
      ? entry.percent
      : typeof entry.score === "number"
      ? entry.score
      : typeof entry.certitude === "number"
      ? entry.certitude
      : 0;

  if (!Number.isFinite(confidenceRaw)) confidenceRaw = 0;
  if (confidenceRaw <= 1) confidenceRaw *= 100;
  const confidence = Math.max(0, Math.min(100, Math.round(confidenceRaw)));
  target.push({ species, confidence });
};

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY env variable");
    return jsonResponse({ error: "Configuration serveur incomplete" }, { status: 500 });
  }

  let body: { image?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Requete invalide" }, { status: 400 });
  }

  const sanitizedImage = sanitizeImageInput(body?.image ?? "");
  if (!sanitizedImage) {
    return jsonResponse({ error: "Image obligatoire" }, { status: 400 });
  }

  // Load species BEFORE calling OpenAI so we can constrain the prompt
  let directory: Map<string, string> | null = null;
  try {
    directory = await loadSpeciesDirectory();
  } catch (error) {
    console.error("Failed to load species directory", error);
  }

  const speciesNames = directory?.size
    ? Array.from(directory.values())
    : null;

  const prompt = speciesNames
    ? buildPrompt(speciesNames)
    : FALLBACK_PROMPT;

  console.log(`[detect-species] species loaded: ${speciesNames?.length ?? 0}, prompt length: ${prompt.length}`);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: "system", content: [{ type: "input_text", text: prompt }] },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyse l'image jointe et renvoie exactement le JSON demande (species + confidence). Les pourcentages doivent etre des entiers.",
              },
              {
                type: "input_image",
                image_url: sanitizedImage,
              },
            ],
          },
        ],
        max_output_tokens: 300,
        text: { format: { type: "json_object" } },
        reasoning: { effort: "low" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error", response.status, errorText);
      return jsonResponse(
        { error: "Analyse indisponible", debug: { status: response.status, detail: errorText.slice(0, 500) } },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const serialized = extractTextFromResponse(payload);
    const cleaned = serialized.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(cleaned);

    const suggestions: Suggestion[] = [];
    if (parsed?.primary) pushSuggestion(suggestions, parsed.primary);
    if (Array.isArray(parsed?.alternatives)) {
      for (const entry of parsed.alternatives) {
        if (suggestions.length >= 3) break;
        pushSuggestion(suggestions, entry);
      }
    }

    if (!suggestions.length) {
      return jsonResponse({ error: "Aucune proposition" }, { status: 422 });
    }

    // Check if all suggestions are "unknown" (AI couldn't match anything)
    const allUnknown = suggestions.every((s) => {
      const lower = s.species.toLowerCase();
      return lower === "unknown" || lower === "inconnu" || lower === "unk" || s.confidence === 0;
    });

    if (allUnknown) {
      return jsonResponse({
        suggestions: [],
        unmatched: true,
        error: "Espece non reconnue",
      });
    }

    // When constrained by the species list, all results come from the DB
    const harmonized = suggestions.map((suggestion) => {
      if (speciesNames) {
        // We gave the AI a constrained list — verify the name is actually in it
        const matchedLabel = matchAgainstDirectory(suggestion.species, directory);
        if (matchedLabel) {
          return {
            ...suggestion,
            species: matchedLabel,
            matched: true,
            source: "database" as const,
          };
        }
        // AI returned a name not in the list despite instructions — flag it
        return { ...suggestion, matched: false, source: "ai" as const, unmatched: true };
      }
      // Fallback mode (no species list loaded) — try best-effort matching
      const matchedLabel = matchAgainstDirectory(suggestion.species, directory);
      if (matchedLabel) {
        return {
          ...suggestion,
          species: matchedLabel,
          matched: true,
          source: "database" as const,
        };
      }
      return { ...suggestion, matched: false, source: "ai" as const };
    });

    return jsonResponse({ suggestions: harmonized.slice(0, 3) });
  } catch (error) {
    console.error("detect-species error", error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "Erreur interne", debug: msg.slice(0, 500) }, { status: 500 });
  }
});

