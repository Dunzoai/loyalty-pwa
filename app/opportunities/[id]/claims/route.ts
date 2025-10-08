import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ ok:false, error:'not_authenticated' }, { status: 401 });

  // (Optional) verify they hold an active influencer card
  const { data: hasCard } = await supabase
    .from('cards')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('tier', 'ambassador')
    .eq('status', 'active')
    .maybeSingle();
  if (!hasCard) return NextResponse.json({ ok:false, error:'no_influencer_card' }, { status: 403 });

  // insert claim as requested
  const { error } = await supabase
    .from('opportunity_claims')
    .insert({
      opportunity_id: params.id,
      user_id: session.user.id,
      status: 'requested'
    });

  if (error) return NextResponse.json({ ok:false, error:'insert_failed' }, { status: 400 });
  return NextResponse.json({ ok:true });
}
