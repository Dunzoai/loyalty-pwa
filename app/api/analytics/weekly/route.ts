import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  try {
    // Create array for the past 7 days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      days.push({
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        formatted: date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'}),
        count: 0
      });
    }
    
    // Get the start date (7 days ago)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    // Get redemption data for the past week
    const { data, error } = await supabase
      .from('perk_redemptions')
      .select('id, redeemed_at, perk_id, Perks(title)')
      .eq('status', 'redeemed')
      .gte('redeemed_at', startDate.toISOString())
      .lte('redeemed_at', today.toISOString());
    
    if (error) throw error;
    
    // Count redemptions per day
    data.forEach(redemption => {
      const redemptionDate = new Date(redemption.redeemed_at).toISOString().split('T')[0];
      const dayIndex = days.findIndex(day => day.date === redemptionDate);
      
      if (dayIndex !== -1) {
        days[dayIndex].count++;
      }
    });
    
    // Get perk counts for top perks this week
    const perkCounts = {};
    data.forEach(redemption => {
      const perkId = redemption.perk_id;
      const perkTitle = redemption.Perks?.title || 'Unknown';
      
      if (!perkCounts[perkId]) {
        perkCounts[perkId] = {
          id: perkId,
          title: perkTitle,
          count: 0
        };
      }
      
      perkCounts[perkId].count++;
    });
    
    // Convert to array and sort
    const topPerks = Object.values(perkCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate stats
    const total = days.reduce((sum, day) => sum + day.count, 0);
    let highest_day = '';
    let highest_count = 0;
    
    days.forEach(day => {
      if (day.count > highest_count) {
        highest_count = day.count;
        highest_day = day.date;
      }
    });
    
    const avg_per_day = total / 7;
    
    return NextResponse.json({
      days,
      total,
      highest_day,
      highest_count,
      avg_per_day,
      top_perks: topPerks
    });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly analytics' },
      { status: 500 }
    );
  }
}