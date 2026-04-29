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
    div.style.cssText = 'font-size:.82rem;color:#7a6050;background:#faf8f4;padding:1.25rem;border-radius:.75rem;margin-bottom:2.5rem;border-left:4px solid #c8922a;line-height:1.6;box-shadow:0 2px 8px rgba(0,0,0,0.04);';
    div.innerHTML = '<strong>☕ 利益揭露：</strong>本篇文章包含聯盟行銷連結。若您透過連結購買，我們可能會獲得小額佣金，這有助於維持 BNotes 的優質內容營運，且不會增加您的購買成本。感謝您的支持！';
    article.prepend(div);
  }
})();
</script>
`;
      cleaned = cleaned.replace('</body>', disclosureScript + '</body>');
    }

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
