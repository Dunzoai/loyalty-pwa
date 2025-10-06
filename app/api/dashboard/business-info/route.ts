// app/api/dashboard/business-info/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const supabase = supabaseServer();
  
  // Get business_id from query params for admin override
  const { searchParams } = new URL(request.url);
  const businessIdParam = searchParams.get('business_id');

  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No session found:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('Users')
      .select('role, email')
      .eq('id', session.user.id)
      .single();

    let businessId;
    
    if (userData?.role === 'admin' && businessIdParam) {
      // Admin can view any business
      businessId = businessIdParam;
    } else if (userData?.role === 'admin') {
      // Admin without specific business - get first business
      const { data: firstBusiness } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .single();
      
      businessId = firstBusiness?.id;
    } else {
      // Regular user - check business_admins table
      const { data: adminData } = await supabase
        .from('business_admins')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!adminData) {
        return NextResponse.json({ error: 'No business found' }, { status: 404 });
      }
      businessId = adminData.business_id;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Get business details
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      console.error('Business not found:', businessId, bizError);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Count active perks (excluding founder perks)
    const { count: perkCount } = await supabase
      .from('perks')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('active', true)
      .eq('is_founder_perk', false);

    // Return real business data
    return NextResponse.json({
      id: business.id,
      name: business.name || 'Unnamed Business',
      subscription_tier: business.subscription_tier || 'starter',
      subscription_status: business.subscription_status || 'active',
      perks_allowed: business.perks_allowed || 2,
      perks_used: perkCount || 0,
      card_inventory: business.card_inventory || 0,
      cards_purchased_total: business.cards_purchased_total || 0
    });

  } catch (error) {
    console.error('Business info API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}