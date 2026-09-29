const COOKIE_NAME = 'ownlane_onboarding_handle';

export function readOnboardingHandle(request: Request) {
  const match = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return '';

  try {
    return decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  } catch {
    return '';
  }
}

export function onboardingHandleCookie(request: Request, handle?: string) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return handle
    ? `${COOKIE_NAME}=${encodeURIComponent(handle)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${secure}`
    : `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
