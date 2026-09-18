import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { ServerRouter, type EntryContext } from 'react-router';

/**
 * Workers have no Node streams, so rendering goes through the web-stream
 * renderer rather than React Router's Node default.
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  let shellRendered = false;
  let status = responseStatusCode;

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        status = 500;
        // Errors thrown after the shell is sent cannot change the response.
        if (shellRendered) console.error(error);
      },
    },
  );
  shellRendered = true;

  const userAgent = request.headers.get('user-agent');
  if (userAgent && isbot(userAgent)) await body.allReady;

  responseHeaders.set('Content-Type', 'text/html');

  return new Response(body, { headers: responseHeaders, status });
}
