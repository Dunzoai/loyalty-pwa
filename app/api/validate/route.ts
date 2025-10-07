export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Redemption code is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get redemption record first
    const { data: redemption, error: fetchError } = await supabase
      .from('perk_redemptions')
      .select('id, code, status, expires_at, created_at, perk_id, user_id')
      .eq('code', code)
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json(
        { error: 'Invalid redemption code' },
        { status: 404 }
      );
    }

    // Get perk details separately
    const { data: perk, error: perkError } = await supabase
      .from('perks')
      .select('title, description')
      .eq('id', redemption.perk_id)
      .single();

    // Get user details separately  
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', redemption.user_id)
      .single();

    // Check if code is expired
    const now = new Date();
    const expiryDate = new Date(redemption.expires_at);
    const isExpired = expiryDate < now;

    // Return redemption data with real values
    return NextResponse.json({
      redemption: {
        id: redemption.id,
        code: redemption.code,
        status: isExpired ? 'expired' : redemption.status,
        perk_title: perk?.title || 'Unknown Perk',
        perk_description: perk?.description || 'No description available',
        user_name: user?.email || 'Unknown Customer',
        expires_at: redemption.expires_at,
        created_at: redemption.created_at,
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}