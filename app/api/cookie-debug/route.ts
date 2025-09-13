// app/api/cookie-debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  console.log('Raw cookie inspection:')
  allCookies.forEach(cookie => {
    console.log(`Cookie: ${cookie.name} = ${cookie.value?.substring(0, 50)}...`)
  })
  
  return NextResponse.json({
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    hasSupabaseCookies: allCookies.some(c => c.name.includes('sb-')),
    cookieDetails: allCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0
    }))
  })
}