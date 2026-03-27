import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// À définir dans RevenueCat Dashboard → Project → Integrations → Webhooks → Authorization header
const WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");

// ── Types ─────────────────────────────────────────────────────────────────────

type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "TRANSFER"
  | "SUBSCRIBER_ALIAS"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_EXTENDED";

type RevenueCatEvent = {
  type: RevenueCatEventType;
  app_user_id: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
};

type WebhookPayload = {
  event: RevenueCatEvent;
  api_version: string;
};

// ── Logique premium ───────────────────────────────────────────────────────────

// Événements qui activent le premium
const PREMIUM_ON: RevenueCatEventType[] = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE", // achat lifetime
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
];

// Événements qui désactivent le premium
const PREMIUM_OFF: RevenueCatEventType[] = [
  "EXPIRATION",
];

// CANCELLATION ne désactive pas immédiatement (accès jusqu'à expiration)
// BILLING_ISSUE idem (RevenueCat envoie EXPIRATION quand vraiment terminé)

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Vérification de l'autorisation
  // RevenueCat envoie la valeur brute dans le header Authorization (sans "Bearer ")
  if (WEBHOOK_AUTH) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    if (token !== WEBHOOK_AUTH) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { event } = payload;
  if (!event?.type || !event?.app_user_id) {
    return new Response("Missing event fields", { status: 400 });
  }

  // Détermine la nouvelle valeur de is_premium
  let isPremium: boolean | null = null;
  if (PREMIUM_ON.includes(event.type)) {
    isPremium = true;
  } else if (PREMIUM_OFF.includes(event.type)) {
    isPremium = false;
  }

  // Événements ignorés (CANCELLATION, BILLING_ISSUE, SUBSCRIBER_ALIAS, etc.)
  if (isPremium === null) {
    console.log(`[webhook] Événement ignoré: ${event.type} for ${event.app_user_id}`);
    return new Response(JSON.stringify({ received: true, action: "ignored" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Récupère tous les alias (RevenueCat peut envoyer l'ancien ou le nouvel ID)
  const userIds = Array.from(
    new Set([event.app_user_id, ...(event.aliases ?? [])]),
  ).filter((id) => id && !id.startsWith("$")); // exclut les IDs anonymes RevenueCat

  if (userIds.length === 0) {
    return new Response("No valid user IDs", { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_premium: isPremium })
    .in("id", userIds);

  if (error) {
    console.error("[webhook] Supabase update error:", error.message);
    return new Response("Database error", { status: 500 });
  }

  console.log(
    `[webhook] ${event.type} → is_premium=${isPremium} for ${userIds.join(", ")}`,
  );

  return new Response(JSON.stringify({ received: true, is_premium: isPremium }), {
    headers: { "Content-Type": "application/json" },
  });
});
