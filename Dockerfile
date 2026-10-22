# ──────────────────────────────────────────────────────────────────────────────
# SendPilot LinkedIn Worker — Docker image
#
# Base tag MUST match the "playwright" / "playwright-core" version in package.json.
# Current lock: 1.64.1  (update both here and render.yaml together)
# ──────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Install Node dependencies first (layer-cached unless lock file changes)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# ── Runtime tunables ──────────────────────────────────────────────────────────
ENV NODE_ENV=production
# Cap old-space so Node GC kicks in before the 512 MB Render limit is hit.
# Raise to 384 if you move to a 1 GB host.
ENV NODE_OPTIONS=--max-old-space-size=256

# Tell the worker it is running inside Docker / Render (no local tunnels needed)
ENV RENDER=true
ENV AUTO_TUNNEL=false

# Render free tier binds on PORT (injected at runtime); default 10000
EXPOSE 10000

# ── Entry point ───────────────────────────────────────────────────────────────
# worker/server.ts is a thin, add-only wrapper around scripts/linkedin-worker.ts.
# It handles: secret-crash-on-boot, PORT env, no-tunnel mode.
CMD ["npx", "tsx", "worker/server.ts"]
