---
description: Never modify the LinkedIn login, session authentication, or live lead extraction flows
---

# Do Not Modify LinkedIn Login & Live Extraction Flows

Do NOT modify the LinkedIn login, session extraction, or live lead extraction flows at any cost unless the user explicitly requests changes to them.

Locked files and handlers:
- `src/lib/linkedin-session-extractor.ts`
- `src/app/api/linkedin/extract-session/route.ts`
- `src/components/dashboard/ConnectLinkedInModal.tsx`
- `src/app/dashboard/accounts/direct-login/page.tsx`
- `src/app/get-started/connect/page.tsx`
- The `/api/extract-session` endpoint in `scripts/linkedin-worker.ts`
- `src/lib/playwright-linkedin-extractor.ts`
- `src/app/api/extractor/linkedin/route.ts`
- The `/api/extract-leads` endpoint in `scripts/linkedin-worker.ts`
