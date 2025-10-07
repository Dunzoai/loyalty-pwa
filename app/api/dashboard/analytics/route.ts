import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  // Set up date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  
  try {
    // Today's redemptions count
    const { count: todayCount, error: todayError } = await supabase
      .from('perk_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'redeemed')
      .gte('redeemed_at', today.toISOString());
    
    if (todayError) throw todayError;
    
    // This week's redemptions
    const { count: weekCount, error: weekError } = await supabase
      .from('perk_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'redeemed')
      .gte('redeemed_at', weekStart.toISOString());
    
    if (weekError) throw weekError;
    
    // Total redemptions
    const { count: totalCount, error: totalError } = await supabase
      .from('perk_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'redeemed');
    
    if (totalError) throw totalError;
    
    // Get perks with redemption counts
    const { data: perkRedemptions, error: perkError } = await supabase
      .from('perk_redemptions')
      .select('perk_id, Perks(id, title)')
      .eq('status', 'redeemed');
    
    if (perkError) throw perkError;
    
    // Count redemptions per perk
    const perkCounts: any = {};
    perkRedemptions.forEach(redemption => {
      if (redemption.perk_id && redemption.Perks) {
        const perkId = redemption.perk_id;
        perkCounts[perkId] = (perkCounts[perkId] || 0) + 1;
      }
    });
    
    // Find the most popular perk
    let mostPopularPerkId: any = null;
    let maxCount = 0;
    
    Object.entries(perkCounts).forEach(([perkId, count]: [string, any]) => {
      if (count > maxCount) {
        mostPopularPerkId = perkId;
        maxCount = count as number;
      }
    });
    
    // Find the perk title
    const mostPopular = (perkRedemptions.find((p: any) => p.perk_id === mostPopularPerkId) as any)?.Perks?.title || '';
    
    // Count returning customers WITHOUT using group()
    // Instead, we'll fetch all redemptions and do the grouping in JavaScript
    const { data: allRedemptions, error: allRedError } = await supabase
      .from('perk_redemptions')
      .select('user_id')
      .eq('status', 'redeemed');
    
    if (allRedError) throw allRedError;
    
    // Count users with multiple redemptions
    const userCounts: any = {};
    allRedemptions.forEach(redemption => {
      if (redemption.user_id) {
        userCounts[redemption.user_id] = (userCounts[redemption.user_id] || 0) + 1;
      }
    });
    
    // Count users with more than 1 redemption
    const repeatCustomers = Object.values(userCounts).filter((count: any) => count > 1).length;
    
    return NextResponse.json({
      today_count: todayCount || 0,
      week_count: weekCount || 0,
      total_count: totalCount || 0,
      most_popular: mostPopular,
      repeat_customers: repeatCustomers
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}