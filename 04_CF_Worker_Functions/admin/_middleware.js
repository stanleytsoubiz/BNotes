/**
 * functions/admin/_middleware.js
 *
 * P1 Security — Admin area password gate
 * ─────────────────────────────────────────────────────────────────────────────
 * Intercepts ALL requests to /admin/* before they reach any page handler.
 *
 * Flow:
 *   1. If ADMIN_PASSWORD env var is not set → pass through (dev/backward-compat)
 *   2. POST /admin/login  → validate password, set HttpOnly session cookie
 *   3. GET  /admin/logout → clear session cookie, redirect to login
 *   4. GET  /admin/login  → serve login page
 *   5. Any other /admin/* → check session cookie; login page if invalid
 *
 * Cookie: HMAC-SHA256(password, salt) — deterministic, no server-side state needed.
 * Cookie flags: HttpOnly, Secure, SameSite=Strict, Path=/admin, Max-Age=8h
 */

const COOKIE_NAME    = 'bnotes_adm';
const COOKIE_MAX_AGE = 8 * 60 * 60;          // 8 hours in seconds
const HMAC_SALT      = 'bnotes-admin-gate-2026';

// ── Crypto helpers ────────────────────────────────────────────────────────────

/** Derive a deterministic hex token: HMAC-SHA256(password, HMAC_SALT) */
async function deriveToken(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(HMAC_SALT));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Cookie parser ─────────────────────────────────────────────────────────────

function getCookies(req) {
  const raw = req.headers.get('Cookie') || '';
  return Object.fromEntries(
    raw.split(';').filter(Boolean).map(c => {
      const idx = c.indexOf('=');
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    }),
  );
}

// ── Login page HTML ───────────────────────────────────────────────────────────

function loginPage(errorMsg = '') {
  const errHTML = errorMsg
    ? `<p class="error">❌ ${errorMsg}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>BNotes 後台登入</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;
     background:#fdf8f2;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#fff;border:1px solid #e8ddd0;border-radius:.85rem;
      padding:2.5rem 2rem;width:100%;max-width:400px;
      box-shadow:0 4px 24px rgba(0,0,0,.09)}
.logo{font-size:1.4rem;font-weight:900;color:#c8922a;margin-bottom:.2rem;letter-spacing:-.02em}
.logo span{color:#1a1a1a}
.subtitle{font-size:.82rem;color:#7a6a58;margin-bottom:2rem}
label{display:block;font-size:.8rem;font-weight:700;color:#7a6a58;
      text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
input[type=password]{width:100%;border:1.5px solid #e8ddd0;border-radius:.5rem;
  padding:.72rem 1rem;font-size:.95rem;outline:none;
  transition:border-color .2s;background:#fdfaf6}
input[type=password]:focus{border-color:#c8922a;background:#fff}
button{width:100%;margin-top:1.1rem;background:#c8922a;color:#fff;border:none;
  border-radius:2rem;padding:.75rem;font-size:.95rem;font-weight:700;
  cursor:pointer;transition:opacity .2s;letter-spacing:.02em}
button:hover{opacity:.85}
button:active{opacity:.7}
.error{font-size:.82rem;color:#d93025;background:#fce8e6;
  border:1px solid #f5c6c3;border-radius:.5rem;
  padding:.6rem .9rem;margin-top:.85rem;line-height:1.5}
.hint{font-size:.75rem;color:#bbb;margin-top:1.25rem;text-align:center}
.divider{border:none;border-top:1px solid #f0ebe2;margin:1.5rem 0}
</style>
</head>
<body>
<div class="card">
  <div class="logo">B<span>Notes</span> 後台</div>
  <div class="subtitle">管理員身份驗證</div>
  <form method="POST" action="/admin/login">
    <label for="pw">管理員密碼</label>
    <input type="password" id="pw" name="password"
           placeholder="••••••••" autocomplete="current-password"
           required autofocus>
    ${errHTML}
    <button type="submit">登入後台 →</button>
  </form>
  <hr class="divider">
  <div class="hint">🔒 此頁面不對外公開索引</div>
</div>
</body>
</html>`;

  return new Response(html, {
    status: errorMsg ? 401 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      // Tight CSP: login page only needs inline styles + form POST to self
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
    },
  });
}

// ── Middleware entry point ────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env, next } = context;
  const url      = new URL(request.url);
  const path     = url.pathname;
  const adminPw  = env.ADMIN_PASSWORD;

  // ── 0. No password configured → pass through (dev / backward-compat) ────
  if (!adminPw) return next();

  const expectedToken = await deriveToken(adminPw);

  // ── 1. Handle login POST ─────────────────────────────────────────────────
  if (request.method === 'POST' && path === '/admin/login') {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return loginPage('請求格式錯誤，請重試');
    }

    const submitted = (formData.get('password') || '').trim();

    if (submitted !== adminPw) {
      // Add a small delay to slow down brute-force attempts
      await new Promise(r => setTimeout(r, 800));
      return loginPage('密碼錯誤，請重試');
    }

    // Password correct → set session cookie and redirect
    const redirectTo = url.searchParams.get('next') || '/admin/articles';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectTo,
        'Set-Cookie': [
          `${COOKIE_NAME}=${expectedToken}`,
          'HttpOnly',
          'Secure',
          'SameSite=Strict',
          'Path=/admin',
          `Max-Age=${COOKIE_MAX_AGE}`,
        ].join('; '),
        'Cache-Control': 'no-store',
      },
    });
  }

  // ── 2. Handle logout ─────────────────────────────────────────────────────
  if (path === '/admin/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin/login',
        'Set-Cookie': [
          `${COOKIE_NAME}=`,
          'HttpOnly',
          'Secure',
          'SameSite=Strict',
          'Path=/admin',
          'Max-Age=0',
        ].join('; '),
        'Cache-Control': 'no-store',
      },
    });
  }

  // ── 3. Allow GET /admin/login → serve login page ─────────────────────────
  if (path === '/admin/login') {
    return loginPage();
  }

  // ── 4. Check session cookie ──────────────────────────────────────────────
  const cookies = getCookies(request);
  if (cookies[COOKIE_NAME] === expectedToken) {
    return next();
  }

  // ── 5. Not authenticated → show login page ───────────────────────────────
  return loginPage();
}
