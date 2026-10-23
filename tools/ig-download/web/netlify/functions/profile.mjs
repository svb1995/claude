// Returns the photo URLs of a public Instagram profile, one page at a time.
const IG_APP_ID = "936619743392459";
const POSTS_QUERY_HASH = "69cba40317214236af40e7efa697781d";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "X-IG-App-ID": IG_APP_ID,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.instagram.com/",
  "X-Requested-With": "XMLHttpRequest",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function photosFromNode(node) {
  const children = node.edge_sidecar_to_children?.edges?.map((e) => e.node) ?? [node];
  return children
    .filter((c) => !c.is_video)
    .map((c, i) => ({
      url: c.display_url,
      name: `${node.shortcode}${children.length > 1 ? `_${i + 1}` : ""}.jpg`,
      takenAt: node.taken_at_timestamp,
    }));
}

function page(media) {
  return {
    photos: media.edges.flatMap((e) => photosFromNode(e.node)),
    nextCursor: media.page_info?.has_next_page ? media.page_info.end_cursor : null,
  };
}

async function igFetch(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: "manual" });
  if (res.status !== 200) {
    const blocked = res.status === 302 || res.status === 401 || res.status === 429;
    throw Object.assign(new Error(blocked ? `Instagram is blocking requests right now (HTTP ${res.status}: login required / rate limited). Try again later.` : `Instagram returned ${res.status}`), { status: blocked ? 429 : 502 });
  }
  return res.json();
}

export default async (req) => {
  const params = new URL(req.url).searchParams;
  const username = (params.get("username") || "").trim().replace(/^@/, "").toLowerCase();
  const cursor = params.get("cursor");
  const userId = params.get("userId");
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return json({ error: "Invalid username" }, 400);

  try {
    if (cursor && userId) {
      const variables = JSON.stringify({ id: userId, first: 50, after: cursor });
      const data = await igFetch(
        `https://www.instagram.com/graphql/query/?query_hash=${POSTS_QUERY_HASH}&variables=${encodeURIComponent(variables)}`
      );
      return json(page(data.data.user.edge_owner_to_timeline_media));
    }

    let data;
    try {
      data = await igFetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`);
    } catch {
      data = await igFetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`);
    }
    const user = data?.data?.user;
    if (!user) return json({ error: "Profile not found" }, 404);
    if (user.is_private) return json({ error: "This profile is private" }, 403);
    return json({
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      postCount: user.edge_owner_to_timeline_media.count,
      profilePic: user.profile_pic_url_hd || user.profile_pic_url,
      ...page(user.edge_owner_to_timeline_media),
    });
  } catch (err) {
    return json({ error: err.message }, err.status || 500);
  }
};

export const config = { path: "/api/profile" };
