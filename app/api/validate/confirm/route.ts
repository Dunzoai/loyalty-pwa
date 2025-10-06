import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Redemption code is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // First, verify the code exists and is valid
    const { data: redemption, error: fetchError } = await supabase
      .from('perk_redemptions')
      .select('id, status, expires_at')
      .eq('code', code)
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json(
        { error: 'Invalid redemption code' },
        { status: 404 }
      );
    }

    // Check if already redeemed
    if (redemption.status === 'redeemed') {
      return NextResponse.json(
        { error: 'This code has already been redeemed' },
        { status: 400 }
      );
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(redemption.expires_at);
    if (expiryDate < now) {
      return NextResponse.json(
        { error: 'This code has expired' },
        { status: 400 }
      );
    }

    // Mark as redeemed
    const { error: updateError } = await supabase
      .from('perk_redemptions')
      .update({ 
        status: 'redeemed',
        redeemed_at: new Date().toISOString()
      })
      .eq('code', code);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm redemption' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Redemption confirmed successfully'
    });

  } catch (error) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}