/**
 * POST /api/subscribe
 * Accepts { email } → saves to Supabase newsletter_subscribers table
 * Env vars (set in Cloudflare Pages dashboard):
 *   SUPABASE_URL              — https://hfyeujaimruzsnmvkqdk.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — server-side secret key (bypasses RLS)
 *
 * P4 Security: In-memory rate limiting (3 requests / 10 min / IP)
 * Prevents email-list flooding and Supabase write-abuse.
 */

// ── P4: In-memory rate limiter ───────────────────────────────────────────────
// Map: ip → { count: number, resetAt: timestamp }
const _subRateMap = new Map();

/**
 * Returns true if the IP is within the allowed subscribe rate.
 * Limit: 3 attempts per 10-minute window per IP.
 */
function checkSubRate(ip, limit = 3, windowSec = 600) {
  const now      = Date.now();
  const windowMs = windowSec * 1000;
  const entry    = _subRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    _subRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}


function jsonResp(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
      ...extra,
    },
  });
}
// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS_ORIGIN = 'https://bnotescoffee.com';

function corsHeaders(origin) {
  const allowed = (origin === CORS_ORIGIN || origin === 'http://localhost:8788')
    ? origin : CORS_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}


// fetch with 15s timeout
async function timeoutFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try { return await timeoutFetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin') || '') });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const hdrs = corsHeaders(origin);

  // ── P4: Rate limit check ─────────────────────────────────────────────────
  const clientIp = request.headers.get('CF-Connecting-IP')
                || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
                || 'unknown';
  if (!checkSubRate(clientIp, 3, 600)) {
    return new Response(
      JSON.stringify({ ok: false, error: '訂閱太頻繁，請 10 分鐘後再試' }),
      { status: 429, headers: { ...hdrs, 'Retry-After': '600' } },
    );
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: hdrs });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: '請輸入有效的電子郵件' }), { status: 422, headers: hdrs });
  }

  // ── Supabase insert ──────────────────────────────────────────────────────
  const supabaseUrl  = env.SUPABASE_URL;
  const supabaseKey  = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Fallback: log and return success so front-end works even before env is set
    console.warn('[subscribe] SUPABASE env not configured — email logged only:', email);
    return new Response(JSON.stringify({ ok: true, message: '訂閱成功！每週日見 ☕' }), { status: 200, headers: hdrs });
  }

  try {
    const res = await timeoutFetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify({ email, source: 'website', subscribed_at: new Date().toISOString() }),
    });

    if (res.status === 201 || res.status === 200) {
      return new Response(JSON.stringify({ ok: true, message: '訂閱成功！每週日見 ☕' }), { status: 200, headers: hdrs });
    }
    if (res.status === 409) {
      return new Response(JSON.stringify({ ok: true, message: '你已經是 BNotes 讀者了 🎉' }), { status: 200, headers: hdrs });
    }
    const errText = await res.text();
    console.error('[subscribe] Supabase error', res.status, errText);
    return new Response(JSON.stringify({ ok: false, error: '伺服器錯誤，請稍後再試' }), { status: 500, headers: hdrs });
  } catch (err) {
    console.error('[subscribe] fetch error', err);
    return new Response(JSON.stringify({ ok: false, error: '網路錯誤，請稍後再試' }), { status: 500, headers: hdrs });
  }
}
