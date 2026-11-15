# Deployment

Cloudflare Pages hosts the game at https://mymininasa.wiki. The www hostname redirects to the apex, preserving paths and query strings.

- Git repository: christianteohx/my-mini-nasa
- Production branch: main; pushes automatically deploy.
- Other branches receive preview deployments.
- Node version: 22
- Build command: `node --test tests/*.test.cjs && node scripts/build.mjs`
- Output directory: `dist`

Tests must pass before publishing. GitHub Actions independently runs the same tests and packaging on pushes and pull requests. No deployment token is needed in this repository: Pages uses its GitHub App connection.

The Vercel project has been removed. Cloudflare Pages is the active host; the retained `vercel.json` is inactive legacy configuration, not a running fallback.
