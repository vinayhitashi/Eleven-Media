import type { ParsedContentUrl } from "../types";
import { hostMatches, safeUrl } from "../stub";

/** facebook.com/{page}/posts/{id}, /{page}/videos/{id}, /watch/?v={id}, /reel/{id}, permalink.php?story_fbid=. */
export function parseFacebookUrl(raw: string): ParsedContentUrl | null {
  const url = safeUrl(raw);
  if (!url || !hostMatches(url, ["facebook.com", "fb.com", "fb.watch"])) return null;
  const path = url.pathname;
  const q = url.searchParams;
  let id: string | null = null;
  let contentType: string | null = "post";
  let m: RegExpExecArray | null;
  if ((m = /\/videos\/(?:[^/]+\/)?(\d+)/.exec(path))) { id = m[1]!; contentType = "video"; }
  else if ((m = /\/reel\/(\d+)/.exec(path))) { id = m[1]!; contentType = "reel"; }
  else if ((m = /\/posts\/([\w.]+)/.exec(path))) id = m[1]!;
  else if (path.startsWith("/watch") && q.get("v")) { id = q.get("v"); contentType = "video"; }
  else if (q.get("story_fbid")) id = q.get("story_fbid");
  else contentType = null;
  return { platform: "facebook", contentId: id, url: url.toString(), contentType };
}
