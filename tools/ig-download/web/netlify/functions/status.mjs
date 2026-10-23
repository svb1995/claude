// Reports a scrape's progress; once finished, returns the photo URLs it found.
import { apify, json } from "../lib/apify.mjs";

const FIELDS = "type,displayUrl,images,childPosts,shortCode,timestamp,ownerUsername";

function photosFromPost(post) {
  const date = post.timestamp ? post.timestamp.slice(0, 10) + "_" : "";
  let urls;
  if (post.childPosts?.length) {
    urls = post.childPosts.filter((c) => c.type !== "Video").map((c) => c.displayUrl);
  } else if (post.type === "Sidecar" && post.images?.length) {
    urls = post.images;
  } else if (post.type !== "Video") {
    urls = [post.displayUrl];
  } else {
    urls = [];
  }
  urls = urls.filter(Boolean);
  return urls.map((url, i) => ({ url, name: `${date}${post.shortCode}${urls.length > 1 ? `_${i + 1}` : ""}.jpg` }));
}

export default async (req) => {
  const runId = new URL(req.url).searchParams.get("runId") || "";
  if (!/^[A-Za-z0-9]{8,32}$/.test(runId)) return json({ error: "Invalid run id" }, 400);

  try {
    const { data: run } = await apify(`/actor-runs/${runId}`);
    if (["READY", "RUNNING"].includes(run.status)) return json({ status: "running" });
    if (run.status !== "SUCCEEDED") return json({ error: `Scrape ${run.status.toLowerCase()}` }, 502);

    const items = await apify(`/datasets/${run.defaultDatasetId}/items?clean=true&fields=${FIELDS}`);
    const errorItem = items.find((i) => i.error);
    const posts = items.filter((i) => i.shortCode);
    if (!posts.length) {
      return json({ error: errorItem?.errorDescription || errorItem?.error || "No posts found — is the profile public?" }, 404);
    }
    return json({
      status: "done",
      username: posts[0].ownerUsername,
      postCount: posts.length,
      photos: posts.flatMap(photosFromPost),
    });
  } catch (err) {
    return json({ error: err.message }, err.status || 500);
  }
};

export const config = { path: "/api/status" };
