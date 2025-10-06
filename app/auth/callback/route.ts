// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// GET handler for magic link callbacks
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("Magic link callback - code:", code ? "present" : "missing");

  if (code) {
    const supabase = supabaseServer();  // Removed 'await'
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        console.log("Magic link success, redirecting to:", next);
        return NextResponse.redirect(new URL(next, origin));
      }
      
      console.error("Magic link exchange error:", error);
    } catch (err) {
      console.error("Magic link callback error:", err);
    }
  }

  // Redirect to error page if something went wrong
  return NextResponse.redirect(new URL("/auth/error", origin));
}

// POST handler for AuthListener state sync
export async function POST(req: Request) {
  const supabase = supabaseServer();  // Removed 'await'

  // Be tolerant of empty bodies (avoid "Unexpected end of JSON input")
  let event = "";
  let session:
    | {
        access_token?: string;
        refresh_token?: string;
      }
    | undefined;

  try {
    const raw = await req.text();
    if (raw) {
      const parsed = JSON.parse(raw) as any;
      event = parsed.event ?? "";
      session = parsed.session;
    }
  } catch {
    // swallow — we still try to continue safely
  }

  console.log("Auth callback POST - event:", event, "has session:", !!session);

  try {
    if (
      (event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION") &&
      session?.access_token &&
      session?.refresh_token
    ) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      console.log("Session set successfully");
    } else if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
      console.log("Signed out successfully");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/callback] error", e);
    return NextResponse.json({ ok: false, error: "callback_failed" }, { status: 400 });
  }
}