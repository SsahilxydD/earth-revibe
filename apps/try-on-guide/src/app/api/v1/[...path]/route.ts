/**
 * Server-side proxy for /api/v1/* — runs on the Next server, calls Railway,
 * forwards the response (including Set-Cookie) back to the browser.
 *
 * Why a Route Handler instead of next.config.mjs `rewrites`:
 *   The API's CORS allowlist only accepts a fixed set of origins. Browser
 *   requests forward `Origin: http://<host>:<port>` to Railway through a
 *   plain rewrite, which Railway then rejects (500 from the cors() error
 *   handler). A Route Handler does the fetch server-to-server, where there
 *   is no browser Origin to forward, so Railway treats it as an allowed
 *   server call.
 */
const API_ORIGIN = (
  process.env.API_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'https://earth-revibeapi-production.up.railway.app'
).replace(/\/+$/, '');

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'origin',
  'referer',
  'content-length',
  // undici (Node's fetch impl) rejects Expect; not meaningful for our proxy.
  'expect',
]);

function buildForwardHeaders(req: Request): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

function buildResponseHeaders(upstream: Response): Headers {
  const out = new Headers();
  // The default fetch Response strips per-cookie Set-Cookie into a single
  // joined value. We need to preserve them split because each cookie is its
  // own header. Use upstream.headers.getSetCookie() when available.
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [];

  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) return;
    if (k === 'set-cookie') return; // handled below
    if (k === 'content-encoding') return; // already decoded by fetch
    out.set(key, value);
  });

  // Strip the `Secure` attribute on HTTP dev so the cookie sticks on
  // http://<lan-ip>:3003. Production deploys are HTTPS so this branch
  // is a no-op there.
  const isHttpsRequest =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  for (const c of setCookies) {
    out.append('set-cookie', isHttpsRequest ? c : c.replace(/;\s*Secure/gi, ''));
  }

  return out;
}

async function proxy(req: Request, params: { path: string[] }) {
  const search = new URL(req.url).search;
  const targetUrl = `${API_ORIGIN}/api/v1/${params.path.join('/')}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: buildForwardHeaders(req),
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    console.error('[try-on-guide proxy] fetch failed', { targetUrl, err });
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'PROXY_NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Cannot reach the API.',
        },
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: buildResponseHeaders(upstream),
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function POST(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function PUT(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function PATCH(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function DELETE(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function OPTIONS(req: Request, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
