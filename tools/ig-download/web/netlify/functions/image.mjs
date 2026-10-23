// Proxies Instagram CDN images so the browser can zip them (the CDN sends no CORS headers).
const ALLOWED_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

export default async (req) => {
  const raw = new URL(req.url).searchParams.get("url");
  let target;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }
  const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
};

export const config = { path: "/api/image" };
