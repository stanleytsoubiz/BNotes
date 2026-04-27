/**
 * functions/admin/login.js
 *
 * Handles GET /admin/login — serves the login page HTML.
 * POST /admin/login is handled by _middleware.js before reaching here.
 *
 * This stub exists so Cloudflare Pages recognises /admin/login as a valid
 * Function route (no static file needed). The middleware intercepts all
 * /admin/* requests first, so GET /admin/login is served by the middleware
 * loginPage() helper and this handler is only reached when ADMIN_PASSWORD
 * is not configured (dev/backward-compat mode).
 */
export async function onRequestGet() {
  // If middleware didn't intercept (no ADMIN_PASSWORD set), redirect to articles
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin/articles', 'Cache-Control': 'no-store' },
  });
}
