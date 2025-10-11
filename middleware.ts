import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // If they've seen the business landing page before, skip straight to dashboard
  if (url.pathname === '/business' && req.cookies.get('sl_biz_seen')?.value === '1') {
    url.pathname = '/business/dashboard';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/business',
};
