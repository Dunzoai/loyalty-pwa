import { NextResponse } from "next/server";
import { createRedemption } from "@/app/actions";

export async function POST(req: Request) {
  const { perkId } = await req.json().catch(() => ({ perkId: undefined }));
  if (!perkId) {
    return NextResponse.json({ ok: false, error: "missing_perkId" }, { status: 400 });
  }

  const result = await createRedemption(perkId);
  const status = result.ok ? 200 : 400;
  return NextResponse.json(result, { status });
}
