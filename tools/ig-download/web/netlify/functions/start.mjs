// Starts an Apify scrape of a profile's posts and returns the run id to poll.
import { ACTOR, apify, json } from "../lib/apify.mjs";

export default async (req) => {
  const username = (new URL(req.url).searchParams.get("username") || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return json({ error: "Invalid username" }, 400);
  const limit = Number(process.env.MAX_POSTS) || 200;

  try {
    const { data } = await apify(`/acts/${ACTOR}/runs`, {
      method: "POST",
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: limit,
        addParentData: false,
      }),
    });
    return json({ runId: data.id, limit });
  } catch (err) {
    return json({ error: err.message }, err.status || 500);
  }
};

export const config = { path: "/api/start" };
