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

    // ── Global Affiliate Disclosure Injection ──
    if (cleaned.includes('</body>')) {
      const disclosureScript = `
<script>
(function() {
  const article = document.querySelector('.article-body, .article-content, article');
  if (!article) return;
  const patterns = [/amazon\\./i, /amzn\\.to/i, /shopee\\.tw/i, /shope\\.ee/i, /rstyle\\.me/i, /shopstyle\\.com/i, /\\/re\\//i];
  const links = article.querySelectorAll('a[href]');
  if ([...links].some(l => patterns.some(p => p.test(l.href))) && !article.querySelector('.affiliate-disclosure')) {
    const div = document.createElement('div');
    div.className = 'affiliate-disclosure';
    div.style.cssText = 'font-size:.74rem;color:oklch(55% .02 30);font-style:italic;margin:2em auto .5em;padding:0 24px;line-height:1.55;text-align:left;max-width:740px;';
    div.innerHTML = '※ 本文含聯盟連結。透過連結購買，BNotes 可能獲得佣金，這不會增加您的成本，且支持我們持續產製獨立內容。';
    // 移至文末：references 之後、share 之前
    const refs = article.querySelector('.references');
    const share = article.querySelector('.share-section');
    if (refs && refs.parentNode) {
      refs.parentNode.insertBefore(div, refs.nextSibling);
    } else if (share && share.parentNode) {
      share.parentNode.insertBefore(div, share);
    } else {
      article.appendChild(div);
    }
  }
})();
</script>
`;
      cleaned = cleaned.replace('</body>', disclosureScript + '</body>');
    }

    // Always reconstruct Response
 — original body is already consumed by response.text()
    const h = new Headers(response.headers);
    h.set('Content-Type', 'text/html; charset=utf-8');
    h.delete('Content-Length');
    return new Response(cleaned, { status: response.status, headers: h });
  } catch (err) {
    // Fallback: let Cloudflare serve the file directly
    return new Response('Internal Error', { status: 500 });
  }
}
