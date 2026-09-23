import type { Route } from './+types/embed-script';

/**
 * The embed loader.
 *
 * It mounts an iframe rather than injecting markup. An iframe cannot read the
 * host page's cookies or DOM, and the host's CSS cannot break the form — which
 * matters when the form is collecting somebody's name and email address on a
 * site Ownlane does not control.
 *
 * Served from this Worker, not a CDN: one origin, one deploy, and no second
 * thing to invalidate.
 */
const SOURCE = `
(function () {
  var scripts = document.querySelectorAll('script[data-ownlane]');
  for (var i = 0; i < scripts.length; i++) {
    (function (script) {
      if (script.getAttribute('data-mounted')) return;
      script.setAttribute('data-mounted', '1');

      var slug = script.getAttribute('data-ownlane');
      var widget = script.getAttribute('data-widget') || 'contact';
      var theme = script.getAttribute('data-theme') || 'auto';
      var origin = new URL(script.src).origin;

      var frame = document.createElement('iframe');
      frame.src = origin + '/embed/' + encodeURIComponent(slug) +
        '?widget=' + encodeURIComponent(widget) + '&theme=' + encodeURIComponent(theme);
      frame.style.width = '100%';
      frame.style.border = '0';
      frame.style.display = 'block';
      frame.style.colorScheme = 'normal';
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('title', 'Ownlane');
      // Only what the widget needs. No same-origin access to the host page.
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
      frame.height = widget === 'card' ? '260' : '520';

      script.parentNode.insertBefore(frame, script.nextSibling);

      // The widget reports its own height so the frame never scrolls internally
      // or leaves a gap. Messages are accepted only from the frame we created.
      window.addEventListener('message', function (event) {
        if (event.origin !== origin) return;
        if (event.source !== frame.contentWindow) return;
        if (!event.data || event.data.type !== 'ownlane:height') return;
        frame.height = String(Math.ceil(event.data.height));
      });
    })(scripts[i]);
  }
})();
`;

export function loader(_: Route.LoaderArgs) {
  return new Response(SOURCE, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      // Safe to cache: the script only ever mounts a frame, and the frame's
      // contents are what actually change.
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
