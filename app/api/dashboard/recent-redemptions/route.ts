import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  try {
    // Get recent redemptions
    const { data, error } = await supabase
      .from('perk_redemptions')
      .select(`
        id, 
        code,
        status,
        redeemed_at, 
        created_at,
        perk_id,
        Perks(id, title, description),
        user_id
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    // Get user info separately if needed
    const userIds = data.map((item: any) => item.user_id).filter(Boolean);
    let users: any = {};
    
    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('id, name, email')
        .in('id', userIds);
      
      if (!userError && userData) {
        // Create lookup object
        userData.forEach(user => {
          users[user.id] = user;
        });
      }
    }
    
    // Format data for frontend
    const redemptions = data.map((item: any) => ({
      id: item.id,
      perk_id: item.perk_id,
      perk_title: item.Perks?.title || 'Unknown Perk',
      user_name: users[item.user_id]?.name || 'Unknown User',
      user_email: users[item.user_id]?.email || '',
      redeemed_at: item.redeemed_at || item.created_at,
      code: item.code
    }));
    
    return NextResponse.json(redemptions);
  } catch (error) {
    console.error('Recent redemptions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent redemptions' },
      { status: 500 }
    );
  }
}