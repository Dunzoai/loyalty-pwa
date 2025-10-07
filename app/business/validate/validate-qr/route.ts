// app/api/business/validate-qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

function generateRedemptionCode(chars = 20) {
  return randomBytes(32).toString("base64url").slice(0, chars);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrCode } = body;
    
    if (!qrCode) {
      return NextResponse.json(
        { ok: false, error: 'QR code required' },
        { status: 400 }
      );
    }

    // Parse the temporary QR code
    // Format: TEMP_<userId>_<perkId>_<timestamp>
    const parts = qrCode.split('_');
    
    if (parts[0] !== 'TEMP' || parts.length !== 4) {
      return NextResponse.json(
        { ok: false, error: 'Invalid QR code format' },
        { status: 400 }
      );
    }

    const [, userId, perkId, timestamp] = parts;
    
    // Check if QR code is expired (older than 45 seconds)
    const codeAge = Date.now() - parseInt(timestamp);
    if (codeAge > 45000) {
      return NextResponse.json(
        { ok: false, error: 'QR code expired' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get the business user (the one scanning)
    const { data: { session }, error: sessErr } = await supabase.auth.getSession();
    
    if (sessErr || !session?.user) {
      return NextResponse.json({ ok: false, error: "not_authenticated" });
    }

    // Check if this user is a business admin
    const { data: businessAdmin } = await supabase
      .from('business_admins')
      .select('business_id')
      .eq('user_id', session.user.id)
      .single();

    if (!businessAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Not authorized as business admin' },
        { status: 403 }
      );
    }

    // Verify the perk exists and belongs to this business
    const { data: perk, error: perkError } = await supabase
      .from('perks')
      .select('id, title, business_id, max_redemptions_per_user, active')
      .eq('id', perkId)
      .single();

    if (perkError || !perk) {
      return NextResponse.json(
        { ok: false, error: 'Perk not found' },
        { status: 404 }
      );
    }

    if (!perk.active) {
      return NextResponse.json(
        { ok: false, error: 'Perk is not active' },
        { status: 400 }
      );
    }

    if (perk.business_id !== businessAdmin.business_id) {
      return NextResponse.json(
        { ok: false, error: 'This perk does not belong to your business' },
        { status: 403 }
      );
    }

    // Check redemption limit for this user
    const { count } = await supabase
      .from('perk_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('perk_id', perkId)
      .eq('status', 'redeemed');

    const maxRedemptions = perk.max_redemptions_per_user || 1;
    
    if (count !== null && count >= maxRedemptions) {
      return NextResponse.json({ 
        ok: false, 
        error: `Redemption limit reached (${count}/${maxRedemptions})` 
      }, { status: 400 });
    }

    // Check if this exact timestamp was already redeemed (prevent double-scan)
    const { data: existing } = await supabase
      .from('perk_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('perk_id', perkId)
      .gte('created_at', new Date(parseInt(timestamp) - 1000).toISOString())
      .lte('created_at', new Date(parseInt(timestamp) + 1000).toISOString())
      .single();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Already redeemed' },
        { status: 400 }
      );
    }

    // Create the redemption record - directly as 'redeemed'
    const permanentCode = generateRedemptionCode();
    const now = new Date();
    
    const { data: redemption, error: redemptionError } = await supabase
      .from('perk_redemptions')
      .insert({
        user_id: userId,
        perk_id: perkId,
        code: permanentCode,
        status: 'redeemed',
        created_at: now.toISOString(),
        redeemed_at: now.toISOString()
      })
      .select('id, code')
      .single();

    if (redemptionError) {
      console.error('Redemption error:', redemptionError);
      return NextResponse.json(
        { ok: false, error: 'Failed to create redemption' },
        { status: 500 }
      );
    }

    // Get user info for confirmation
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      ok: true,
      redemption: {
        id: redemption.id,
        code: redemption.code,
        perk: {
          id: perk.id,
          title: perk.title
        },
        user: userData,
        redeemedAt: now.toISOString(),
        redemptionCount: (count || 0) + 1,
        maxRedemptions: maxRedemptions
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}