// Shared helpers for talking to the Apify Instagram scraper.
export const ACTOR = "apify~instagram-scraper";
export const API = "https://api.apify.com/v2";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function token() {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw Object.assign(new Error("APIFY_TOKEN is not set on the Netlify project"), { status: 500 });
  return t;
}

export async function apify(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.error?.message || `Apify returned ${res.status}`), { status: 502 });
  }
  return body;
}
