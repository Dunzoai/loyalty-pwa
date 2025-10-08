"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

/**
 * Toggle a like and return the canonical state for this perk.
 * Response: { ok: boolean, liked: boolean, count: number }
 */
export async function toggleLike(perkId: string, userId: string) {
  const supabase = supabaseServer();

  // Do we already have a like?
  const { data: existing, error: findErr } = await supabase
    .from("perk_likes")
    .select("id")
    .eq("perk_id", perkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findErr) {
    console.error("[toggleLike] findErr", findErr);
    return { ok: false, liked: false, count: 0 };
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from("perk_likes")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      console.error("[toggleLike] deleteErr", delErr);
      // We'll still return the current canonical count below
    }
  } else {
    const { error: insErr } = await supabase
      .from("perk_likes")
      .insert({ perk_id: perkId, user_id: userId });
    if (insErr) {
      console.error("[toggleLike] insertErr", insErr);
      // We'll still return the current canonical count below
    }
  }

  // Canonical count from DB
  const { count } = await supabase
    .from("perk_likes")
    .select("*", { count: "exact", head: true })
    .eq("perk_id", perkId);

  const liked = !existing;
  return { ok: true, liked, count: count ?? 0 };
}

/* ======================================================================
   NEW: createRedemption(perkId)
   - Generates a 45s QR code for the signed-in user
   - Checks: session, perk exists+active, user has active card at required tier
   - Inserts row into perk_redemptions with status='pending' and expires_at
   - Returns { ok, redemptionId, code, expiresAt }
   ====================================================================== */

function shortRandomCode(chars = 22) {
  // URL-safe base64 and trim to a friendly length
  return randomBytes(32).toString("base64url").slice(0, chars);
}

export async function createRedemption(perkId: string) {
  const supabase = supabaseServer();

  // 0) Session
  const {
    data: { session },
    error: sessErr,
  } = await supabase.auth.getSession();
  if (sessErr || !session?.user) {
    return { ok: false, error: "not_authenticated" };
  }
  const userId = session.user.id;

  // 1) Load the perk
  const { data: perk, error: perkErr } = await supabase
    .from("perks")
    .select("id, active, required_card_tier, business_id")
    .eq("id", perkId)
    .single();

  if (perkErr || !perk) return { ok: false, error: "perk_not_found" };
  if (!perk.active) return { ok: false, error: "perk_inactive" };

  // 2) Check user has an active card that meets the required tier
  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("tier, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (cardErr) {
    console.error("[createRedemption] cardErr", cardErr);
    return { ok: false, error: "card_check_failed" };
  }
  if (!card) return { ok: false, error: "no_active_card" };

  // Simple tier ranking (adjust if your enum meaning changes)
  const rank: Record<string, number> = { shortlist: 1, ambassador: 2, founding_shortlist: 3 };
  const userRank = rank[card.tier as string] ?? 0;
  const requiredRank = rank[perk.required_card_tier as string] ?? 0;
  if (userRank < requiredRank) return { ok: false, error: "insufficient_tier" };

  // 3) Create short-lived code (45s). Limits are enforced at verify time.
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 45_000);
  const code = shortRandomCode(20);

  const { data: inserted, error: insErr } = await supabase
    .from("perk_redemptions")
    .insert({
      perk_id: perk.id,
      user_id: userId,
      code,
      status: "pending", // ⬅️ align with your table CHECK
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, code, expires_at")
    .single();

  if (insErr) {
    console.error("[createRedemption] insertErr", insErr);
    return { ok: false, error: "insert_failed" };
  }

  return {
    ok: true,
    redemptionId: inserted.id,
    code: inserted.code,
    expiresAt: inserted.expires_at,
  };
}
