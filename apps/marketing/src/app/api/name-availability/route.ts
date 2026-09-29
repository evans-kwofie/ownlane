function dashboardOrigin() {
  return process.env.OWNLANE_API_ORIGIN ?? '';
}

export async function GET(request: Request) {
  const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID();
  const startedAt = Date.now();
  const origin = dashboardOrigin();
  if (!origin) {
    console.error('[name-availability:proxy] upstream unavailable', { requestId });
    return Response.json(
      { valid: false, free: false },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    );
  }

  const handle = new URL(request.url).searchParams.get('handle') ?? '';
  try {
    const upstream = await fetch(`${origin}/name-availability?handle=${encodeURIComponent(handle)}`, {
      cache: 'no-store',
      headers: { 'X-Request-ID': requestId },
    });
    const result = await upstream.json().catch(() => ({ valid: false, free: false }));
    console.info('[name-availability:proxy] completed', {
      requestId,
      handle: handle.trim().toLowerCase(),
      status: upstream.status,
      durationMs: Date.now() - startedAt,
    });
    return Response.json(result, {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    });
  } catch (error) {
    console.error('[name-availability:proxy] failed', {
      requestId,
      handle: handle.trim().toLowerCase(),
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { valid: false, free: false },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    );
  }
}
