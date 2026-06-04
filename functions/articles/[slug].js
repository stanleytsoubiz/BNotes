// functions/articles/[slug].js
// Frontmatter stripper for /articles/* pages
// Fixed: avoid returning already-consumed Response body (Error 1101)
export async function onRequestGet(context) {
  try {
    const { request, params, env } = context;
    const slug = String(params.slug || '').replace(/\.html$/, '');
    const assetUrl = new URL(request.url);
    assetUrl.pathname = `/articles/${slug}.html`;
    assetUrl.search = '';

    let response = env.ASSETS
      ? await env.ASSETS.fetch(new Request(assetUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'text/html,*/*' },
        }))
      : await context.next();

    if (response.status === 404) {
      response = await context.next();
    }

    const ct = response.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return response;

    let text = await response.text();
    if (!text && env.ASSETS) {
      const retry = await env.ASSETS.fetch(assetUrl.toString());
      const retryCt = retry.headers.get('Content-Type') || '';
      if (retry.ok && retryCt.includes('text/html')) {
        response = retry;
        text = await retry.text();
      }
    }

    if (!text) {
      response = await context.next();
      text = await response.text();
    }

    // Strip YAML frontmatter if present
    let cleaned = text.replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]/, '');

    // Always reconstruct Response
    // original body is already consumed by response.text()
    const h = new Headers(response.headers);
    h.set('Content-Type', 'text/html; charset=utf-8');
    h.delete('Content-Length');
    return new Response(cleaned, { status: response.status, headers: h });
  } catch (err) {
    // Fallback: let Cloudflare serve the file directly
    return new Response('Internal Error', { status: 500 });
  }
}
