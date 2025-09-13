// app/api/redeem/new/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRedemption } from '@/app/redeem/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { perkId } = body

    if (!perkId) {
      return NextResponse.json(
        { ok: false, error: 'perk_id_required' },
        { status: 400 }
      )
    }

    // Call your existing Server Action
    const result = await createRedemption(perkId)
    
    // Return the result as JSON
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in /api/redeem/new:', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}