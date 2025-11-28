# Client-only deploy notes

## Local build
cd client
pnpm install
pnpm build
# serve the dist folder locally:
npx serve -s dist   # or use a static server of your choice

## Docker (recommended for consistent production)
# build (from repo root)
docker build -f client/Dockerfile --build-arg APP_ROOT=client -t vibe-client:latest .
# build (from client folder)
docker build --build-arg APP_ROOT=. -t vibe-client:latest .
# run
docker run --rm -p 8080:80 vibe-client:latest
# visit http://localhost:8080

## Netlify
- Connect your repository to Netlify
- Set base directory to `client` (or set build command `pnpm install --frozen-lockfile && pnpm build` and publish `client/dist`)
- Netlify will use netlify.toml -> publish `dist` and redirect SPA routes to index.html

## Vercel
- Deploy the `client` folder (set project root to client) or use vercel.json
- Vercel will run `pnpm build` and serve `dist`

## Vercel (step-by-step)

1. Create a new project on Vercel and connect your repository.
2. Set "Root Directory" (or Project Settings > General > Root Directory) to `client` so Vercel runs the build inside the client folder.
3. Build settings:
   - Framework Preset: Other
   - Build Command: pnpm build
   - Output Directory: dist
4. Environment variables (build-time):
   - In Vercel dashboard, go to Project Settings > Environment Variables and add any VITE_* variables your app needs (example: VITE_API_URL, VITE_BASE).
   - Alternatively, you can keep placeholders in `vercel.json` but storing them in the dashboard is recommended for secrets.
5. SPA routing:
   - The included `vercel.json` already rewrites all routes to `/index.html`. No extra redirect files required.

Optional: use the vercel CLI
```
# install
pnpm i -g vercel

# from repo root
cd client
vercel # follow prompts, choose project or create new, ensure root is client
vercel --prod  # deploy production
```

## Vite environment setup (recommended)

Use Vite env variables prefixed with VITE_ so they are exposed to client code at build time.

Example local dev `.env` (do NOT commit secrets):
```env
# filepath: /Users/aryansanganti/Downloads/vibe-realm 2/client/.env
VITE_API_URL=http://localhost:8080/api
VITE_BASE=/
```

Example production `.env.production`:
```env
# filepath: /Users/aryansanganti/Downloads/vibe-realm 2/client/.env.production
VITE_API_URL=https://api.yourdomain.com
# If you host at subpath (example.com/app) set base to '/app/'
VITE_BASE=/
```

How to use in client code:
```ts
// Example: src/utils/api.ts
// Use import.meta.env.VITE_API_URL in code
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchPing = async () => {
  const r = await fetch(`${API_URL}/ping`);
  return r.json();
};
```

vite.config.ts: read VITE_BASE during build (example snippet)
```ts
// filepath: /Users/aryansanganti/Downloads/vibe-realm 2/client/vite.config.ts
// ...existing code...
import { defineConfig } from 'vite';

// Use process.env.VITE_BASE (set by dotenv at build time) or default '/'
export default defineConfig(({ mode }) => {
  // dotenv will load .env, .env.production etc automatically
  const base = process.env.VITE_BASE ?? '/';
  return {
    base,
    // ...existing config...
  };
});
```

Important notes per platform
- Local build
  - Ensure .env or .env.production exists before running pnpm build.
  - Commands:
    cd client
    pnpm install
    pnpm build
    npx serve -s dist   # or any static server

- Docker
  - The Docker multi-stage build reads env files at build time only. To inject production vars into the build, either:
    - COPY a .env.production into the client folder before building image, or
    - set ARG values in Dockerfile and write them to .env.production during build.
  - Runtime-only env changes are not available to client JS built into dist.

- Netlify / Vercel
  - Set VITE_* variables in the project's Environment Variables settings (these are used at build time).
  - Netlify: set base directory to `client`, build command `pnpm install --frozen-lockfile && pnpm build`, publish `dist`.
  - Vercel: set project root to `client` or use vercel.json; set env vars in Project Settings.

- Serving at a subpath
  - If your site will be served from a subpath (example.com/app), set VITE_BASE=/app/ in .env.production and ensure vite.config.ts uses that value (see snippet above).
  - Update nginx or host configuration to serve files under that path.

Troubleshooting
- import.meta.env values are baked into the build. If you change env vars, rebuild.
- To inspect runtime URLs, open the built index.html and check that asset URLs and script tags reflect the base path you expect.
- If you see 404s on client routes, ensure your static server is configured with SPA fallback (try_files /index.html).

## Notes
- The Dockerfile uses corepack -> pnpm. Ensure pnpm-lock.yaml exists for reproducible builds.
- If your app calls backend APIs, update the runtime host or environment variables to point to the backend (CORS and relative path handling).
