import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = supabaseServer();
  
  // Create time slots
  const timeSlots = [
    { hour: '6-8AM', start: 6, end: 8, count: 0 },
    { hour: '8-10AM', start: 8, end: 10, count: 0 },
    { hour: '10-12PM', start: 10, end: 12, count: 0 },
    { hour: '12-2PM', start: 12, end: 14, count: 0 },
    { hour: '2-4PM', start: 14, end: 16, count: 0 },
    { hour: '4-6PM', start: 16, end: 18, count: 0 },
    { hour: '6-8PM', start: 18, end: 20, count: 0 },
    { hour: '8-10PM', start: 20, end: 22, count: 0 }
  ];
  
  try {
    // Get all redemptions with redeemed_at timestamps
    const { data, error } = await supabase
      .from('perk_redemptions')
      .select('redeemed_at')
      .eq('status', 'redeemed')
      .not('redeemed_at', 'is', null);
    
    if (error) throw error;
    
    // Count redemptions by time slot
    data.forEach(redemption => {
      if (redemption.redeemed_at) {
        const date = new Date(redemption.redeemed_at);
        const hour = date.getHours();
        
        // Find matching time slot
        const slot = timeSlots.find(slot => hour >= slot.start && hour < slot.end);
        if (slot) {
          slot.count++;
        }
      }
    });
    
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Time chart error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time chart data' },
      { status: 500 }
    );
  }
}