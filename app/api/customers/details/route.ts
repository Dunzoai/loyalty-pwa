import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  try {
    // Get all users with their redemption counts
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('id, name, email, created_at');
    
    if (userError) throw userError;
    
    // Get all redemptions
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('perk_redemptions')
      .select('id, user_id, status, redeemed_at, created_at, Perks(id, title)');
    
    if (redemptionsError) throw redemptionsError;
    
    // Calculate customer statistics
    const customerStats = userData.map((user: any) => {
      const userRedemptions = redemptionsData.filter((r: any) => r.user_id === user.id && r.status === 'redeemed');
      const redeemedPerks = new Set(userRedemptions.map((r: any) => r.perk_id));
      
      // Get last activity date
      let lastActivity = user.created_at;
      userRedemptions.forEach(redemption => {
        const redemptionDate = redemption.redeemed_at || redemption.created_at;
        if (new Date(redemptionDate) > new Date(lastActivity)) {
          lastActivity = redemptionDate;
        }
      });
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        redemption_count: userRedemptions.length,
        unique_perks_redeemed: redeemedPerks.size,
        created_at: user.created_at,
        last_activity: lastActivity
      };
    });
    
    // Sort by redemption count (descending)
    customerStats.sort((a, b) => b.redemption_count - a.redemption_count);
    
    // Calculate overall statistics
    const totalCustomers = customerStats.length;
    const activeCustomers = customerStats.filter(c => c.redemption_count > 0).length;
    const returningCustomers = customerStats.filter(c => c.redemption_count > 1).length;
    
    return NextResponse.json({
      customers: customerStats,
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      returning_customers: returningCustomers
    });
  } catch (error) {
    console.error('Customer details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}