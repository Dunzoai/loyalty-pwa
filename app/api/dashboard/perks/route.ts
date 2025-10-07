import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  try {
    // Get all perks
    const { data: perksData, error: perksError } = await supabase
      .from('perks')
      .select('id, title, active, required_card_tier, starts_at, ends_at, business_id');
    
    if (perksError) throw perksError;
    
    // Get redemption counts for each perk
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('perk_redemptions')
      .select('id, perk_id, status, redeemed_at')
      .eq('status', 'redeemed');
    
    if (redemptionsError) throw redemptionsError;
    
    // Count redemptions by perk and track last redemption
    const redemptionCounts: any = {};
    const lastRedemptionDates: any = {};
    
    redemptionsData.forEach(redemption => {
      const perkId = redemption.perk_id;
      if (perkId) {
        // Count redemptions
        redemptionCounts[perkId] = (redemptionCounts[perkId] || 0) + 1;
        
        // Track last redemption date
        if (redemption.redeemed_at) {
          if (!lastRedemptionDates[perkId] || redemption.redeemed_at > lastRedemptionDates[perkId]) {
            lastRedemptionDates[perkId] = redemption.redeemed_at;
          }
        }
      }
    });
    
    // Combine data
    const perks = perksData.map(perk => {
      // Determine status
      let status: 'live' | 'scheduled' | 'expired' | 'draft' = 'draft';
      if (perk.active) {
        const now = new Date();
        const starts = perk.starts_at ? new Date(perk.starts_at) : null;
        const ends = perk.ends_at ? new Date(perk.ends_at) : null;
        
        if (!starts || starts <= now) {
          if (!ends || ends > now) {
            status = 'live';
          } else {
            status = 'expired';
          }
        } else {
          status = 'scheduled';
        }
      }
      
      return {
        id: perk.id,
        title: perk.title,
        status,
        tier: perk.required_card_tier,
        redemption_count: redemptionCounts[perk.id] || 0,
        last_redeemed: lastRedemptionDates[perk.id] || undefined
      };
    });
    
    return NextResponse.json(perks);
  } catch (error) {
    console.error('Perks data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch perks data' },
      { status: 500 }
    );
  }
}