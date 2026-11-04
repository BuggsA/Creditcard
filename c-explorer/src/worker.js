/*
 * Serves CardCompass's static files, filling in the site's own origin wherever a
 * page says {{SITE}}. Canonical links, share previews (Open Graph) and the
 * sitemap need absolute URLs.
 *
 * By default the origin is whatever domain the request came in on, so the site
 * works on workers.dev with no setup. Once a custom domain is live, set
 * SITE_URL (in wrangler.jsonc "vars" or the dashboard), e.g.
 * "https://cardcompass.example.com": every page then points search engines at that
 * domain, and requests to any other host (like *.workers.dev) are sent there
 * with a permanent redirect, so the same pages aren't indexed twice.
 *
 * Only the routes listed in wrangler.jsonc's run_worker_first reach this
 * code; every other file (JS, CSS, images) is served directly as a static asset.
 */
const TEXT = /text\/html|text\/plain|xml|json/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const site = (env.SITE_URL || "").replace(/\/+$/, "");

    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (site && !local && url.origin !== site && (request.method === "GET" || request.method === "HEAD")) {
      return Response.redirect(site + url.pathname + url.search, 301);
    }

    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get("content-type") || "";
    if (!res.body || !TEXT.test(type)) return res;

    const body = (await res.text()).replaceAll("{{SITE}}", (!local && site) || url.origin);
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("etag");
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  },
};
