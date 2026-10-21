<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Critical Rule: Do Not Modify LinkedIn Login & Live Extraction Flows

- **NEVER modify the LinkedIn login, session authentication, or live lead extraction flows** at any cost unless explicitly instructed by the user.
- The following files and flows are locked and must not be altered:
  - `src/lib/linkedin-session-extractor.ts`
  - `src/app/api/linkedin/extract-session/route.ts`
  - `src/components/dashboard/ConnectLinkedInModal.tsx`
  - `src/app/dashboard/accounts/direct-login/page.tsx`
  - `src/app/get-started/connect/page.tsx`
  - The `/api/extract-session` handler in `scripts/linkedin-worker.ts`
  - `src/lib/playwright-linkedin-extractor.ts`
  - `src/app/api/extractor/linkedin/route.ts`
  - The `/api/extract-leads` handler in `scripts/linkedin-worker.ts`


