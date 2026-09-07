import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) return NextResponse.json({ error: "Waitlist is not configured yet." }, { status: 503 });

  let payload: { email?: unknown; name?: unknown; creatorType?: unknown; company?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Please try again." }, { status: 400 }); }
  if (typeof payload.company === "string" && payload.company.trim()) return NextResponse.json({ ok: true });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const creatorType = typeof payload.creatorType === "string" ? payload.creatorType.trim() : "";
  if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (name.length > 120 || creatorType.length > 80) return NextResponse.json({ error: "Please shorten your response and try again." }, { status: 400 });

  try {
    const response = await fetch(new URL("/rest/v1/waitlist_signups", supabaseUrl), {
      method: "POST",
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ email, name: name || null, creator_type: creatorType || null, source: "marketing-site" }),
      signal: AbortSignal.timeout(8_000),
    });

    if (response.ok || response.status === 409) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "We could not save your spot. Please try again." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Our waitlist is temporarily unavailable. Please try again in a moment." }, { status: 503 });
  }
}
