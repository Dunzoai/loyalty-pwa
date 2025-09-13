// app/api/debug-auth/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  
  // List all cookies
  const allCookies = cookieStore.getAll()
  console.log('All cookies:', allCookies.map(c => c.name))
  
  // Try to get session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await cookies()).get(name)?.value,
        set: async (name: string, value: string, options?: any) => {
          const c = await cookies()
          c.set({ name, value, ...options })
        },
        remove: async (name: string) => {
          const c = await cookies()
          c.delete(name)
        },
      },
    }
  )
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  return NextResponse.json({
    hasAuthCookies: allCookies.some(c => c.name.includes('sb-')),
    sessionExists: !!session,
    userId: session?.user?.id,
    error: error?.message,
    cookieCount: allCookies.length
  })
}