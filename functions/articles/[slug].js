// functions/articles/[slug].js
// Frontmatter stripper for /articles/* pages
// Fixed: avoid returning already-consumed Response body (Error 1101)
export async function onRequestGet(context) {
  try {
    const response = await context.next();
    const ct = response.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return response;

    const text = await response.text();

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
