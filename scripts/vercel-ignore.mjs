// Vercel "Ignored Build Step" (Settings -> Git -> Ignored Build Step -> Custom):
//   node scripts/vercel-ignore.mjs
// Exit 0 = skip the build, exit 1 = run the build.
//
// Vercel does not expose the PR title as an env variable, so we ask the
// GitHub API for it (the repo is public, no token needed). A PR whose title
// contains the standalone word "WIP" is not built.

const {
  VERCEL_GIT_PULL_REQUEST_ID: pr,
  VERCEL_GIT_REPO_OWNER: owner,
  VERCEL_GIT_REPO_SLUG: repo,
  GITHUB_TOKEN, // optional: only raises the API rate limit (60/h per IP otherwise)
} = process.env;

// No PR yet (e.g. first push of a branch) or a production deploy: build as usual.
if (!pr || !owner || !repo) process.exit(1);

try {
  const headers = { Accept: "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr}`, { headers });
  if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);

  const { title } = await res.json();
  // \b so that "swipe" / "wipe" in a title does not count as WIP.
  const isWip = /\bWIP\b/i.test(title);

  console.log(`PR #${pr} "${title}" -> ${isWip ? "WIP, skipping build" : "building"}`);
  process.exit(isWip ? 0 : 1);
} catch (err) {
  // On any error build anyway: a needless build is better than a silently skipped one.
  console.error(err);
  process.exit(1);
}
