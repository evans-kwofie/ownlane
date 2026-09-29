function dashboardOrigin() {
  return process.env.OWNLANE_API_ORIGIN ?? '';
}

export async function GET(request: Request) {
  const origin = dashboardOrigin();
  if (!origin) return Response.json({ error: 'Account setup is not configured.' }, { status: 503 });

  const handle = new URL(request.url).searchParams.get('handle')?.trim() ?? '';
  const destination = new URL('/start', origin);
  if (handle) destination.searchParams.set('handle', handle);
  return Response.redirect(destination, 302);
}
