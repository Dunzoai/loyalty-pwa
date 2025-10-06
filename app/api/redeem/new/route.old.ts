// app/api/redeem/new/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { randomBytes } from 'crypto'

function shortRandomCode(chars = 22) {
  return randomBytes(32).toString("base64url").slice(0, chars)
}

export async function POST(request: NextRequest) {
  console.log('🔥 REDEEM ENDPOINT STARTED')
  
  try {
    const body = await request.json()
    console.log('🔥 BODY PARSED:', body)
    const { perkId } = body

    if (!perkId) {
      console.log('🔥 NO PERK ID')
      return NextResponse.json(
        { ok: false, error: 'perk_id_required' },
        { status: 400 }
      )
    }

    console.log('🔥 GETTING SUPABASE CLIENT')
    const supabase = supabaseServer()

    // NEW: Check what user context the API actually has
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('🔥 API USER CONTEXT:', { 
      userId: user?.id, 
      userEmail: user?.email,
      error: userError 
    })

    console.log('🔥 GETTING SESSION')
    const { data: { session }, error: sessErr } = await supabase.auth.getSession()
    
    console.log('=== AUTH DEBUG ===')
    console.log('Session error:', sessErr)
    console.log('Session exists:', !!session)
    console.log('User exists:', !!session?.user)
    console.log('User ID:', session?.user?.id)
    
    if (sessErr || !session?.user) {
      console.log('AUTH FAILED - returning not_authenticated')
      return NextResponse.json({ ok: false, error: "not_authenticated" })
    }
    const userId = session.user.id

    // NEW: Let's see what perks this user can actually see
    console.log('🔥 TESTING PERK ACCESS')
    const { data: allPerks, error: allPerksError } = await supabase
      .from("perks")
      .select("id")
      .limit(5)
    
    console.log('🔥 CAN USER SEE ANY PERKS?:', { 
      count: allPerks?.length, 
      error: allPerksError,
      perkIds: allPerks?.map(p => p.id)
    })

    // NEW: Try to query the specific perk with more details
    console.log('🔥 QUERYING SPECIFIC PERK:', perkId)
    const { data: perk, error: perkErr } = await supabase
      .from("perks")
      .select("id, active, required_card_tier, business_id")
      .eq("id", perkId)
      .single()

    console.log('🔥 PERK QUERY RESULT:', { 
      perk, 
      error: perkErr 
    })

    if (perkErr || !perk) {
      console.log('🔥 PERK ERROR:', perkErr)
      return NextResponse.json({ ok: false, error: "perk_not_found" })
    }
    
    if (!perk.active) return NextResponse.json({ ok: false, error: "perk_inactive" })

    // Check user's card
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("tier, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    console.log('🔥 CARD CHECK:', { 
      card, 
      error: cardErr 
    })

    if (cardErr) {
      console.error("cardErr", cardErr)
      return NextResponse.json({ ok: false, error: "card_check_failed" })
    }
    if (!card) return NextResponse.json({ ok: false, error: "no_active_card" })

    const rank: Record<string, number> = { insider: 1, influencer: 2, founder: 3 }
    const userRank = rank[card.tier as string] ?? 0
    const requiredRank = rank[perk.required_card_tier as string] ?? 0
    
    console.log('🔥 TIER CHECK:', { 
      userTier: card.tier,
      userRank,
      requiredTier: perk.required_card_tier,
      requiredRank,
      hasAccess: userRank >= requiredRank 
    })

    if (userRank < requiredRank) return NextResponse.json({ ok: false, error: "insufficient_tier" })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 45_000)
    const code = shortRandomCode(20)

    console.log('🔥 INSERTING REDEMPTION')
    const { data: inserted, error: insErr } = await supabase
      .from("perk_redemptions")
      .insert({
        perk_id: perk.id,
        user_id: userId,
        code,
        status: "pending",
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, code, expires_at")
      .single()

    if (insErr) {
      console.log('🔥 INSERT ERROR:', insErr)
      return NextResponse.json({ ok: false, error: "insert_failed" })
    }

    console.log('🔥 SUCCESS! Redemption created:', inserted.id)
    return NextResponse.json({
      ok: true,
      redemptionId: inserted.id,
      code: inserted.code,
      expiresAt: inserted.expires_at,
    })

  } catch (error) {
    console.error('Error in /api/redeem/new:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}