// Works with Next 15's async cookies() and keeps TS quiet
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function supabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Next 15: cookies() must be awaited
        get: async (name: string) => (await cookies()).get(name)?.value,
        set: async (name: string, value: string, options?: CookieOptions) => {
          (await cookies()).set(name, value, options);
        },
        remove: async (name: string, options?: CookieOptions) => {
          (await cookies()).delete(name, options);
        },
      } as any, // hush TS complaints about the adapter shape
    }
  );
}
