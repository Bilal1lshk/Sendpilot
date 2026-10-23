# Deployment guide

This repo deploys the same `main` branch to two targets without manual branch copying:

- Vercel deploys the Next.js app and API routes from `main`.
- Render deploys the Dockerized LinkedIn worker from `main`.

## One repo, two targets

- Keep the shared worker contract in `src/lib/worker-contract.ts`.
- Update the version only when the worker API contract changes.
- Reuse the same `LINKEDIN_WORKER_SECRET`, `ENCRYPTION_KEY`, and `DATABASE_URL` values in both providers.
- `DATABASE_URL` is accepted as a fallback for `MONGODB_URI`, and `ENCRYPTION_KEY` is accepted as a fallback for `COOKIE_ENC_KEY`.
- LinkedIn browser operations run on the Render worker. Vercel API routes dispatch to Render and do not launch Chromium locally; an unavailable worker returns a retryable response.

## Render

- The service is defined in `render.yaml`.
- It deploys from the `main` branch using Docker and the repo-root `Dockerfile`.
- `buildFilter` limits rebuilds to worker-relevant files.
- Secret values are added in the Render dashboard with `sync: false`.

## Vercel

- Vercel is a standard Next.js deployment from `main`.
- `vercel.json`'s `ignoreCommand` skips builds when only worker or deployment files changed.
- Do not add Playwright browser installation to the Vercel build; keep the worker and Chromium binaries isolated in Docker.
- Set the environment variables in the Vercel project:
  - `LINKEDIN_WORKER_URL`
  - `LINKEDIN_WORKER_SECRET`
  - `ENCRYPTION_KEY`
  - `DATABASE_URL`

## Worker contract

- `WORKER_CONTRACT_VERSION` lives in `src/lib/worker-contract.ts`.
- The worker `/health` endpoint returns `contractVersion` and `commit`.
- The API checks `/health` before dispatching to the worker.
- If the versions do not match, the API returns a queued/waiting response and logs `worker out of date` instead of failing immediately.

## CI

GitHub Actions runs on every push and PR to `main`:

- lint
- typecheck
- security tests
- Playwright version consistency check
- Docker build sanity check

## Tips

- Never commit secrets to the repo.
- Keep `main` as the single source of truth.
- Treat Render and Vercel as deployment targets, not as separate code branches.
