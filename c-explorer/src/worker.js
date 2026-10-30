/*
 * Serves Ledger's static files, filling in the site's own origin wherever a
 * page says {{SITE}}. Canonical links, share previews (Open Graph) and the
 * sitemap need absolute URLs, and this keeps them correct on workers.dev, a
 * custom domain, or both — no domain is hard-coded anywhere.
 *
 * Only the routes listed in wrangler.jsonc's run_worker_first reach this
 * code; every other file (JS, CSS, images) is served directly as a static asset.
 */
const TEXT = /text\/html|text\/plain|xml|json/;

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get("content-type") || "";
    if (!res.body || !TEXT.test(type)) return res;

    const origin = new URL(request.url).origin;
    const body = (await res.text()).replaceAll("{{SITE}}", origin);
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("etag");
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  },
};
