# ─── stage 1: build the dashboard ──────────────────────────────
FROM node:24-alpine AS web

WORKDIR /web
COPY dashboard/package*.json ./
# esbuild ships a platform binary via postinstall, which the build needs
RUN npm ci --allow-scripts=esbuild

COPY dashboard/ ./
RUN npm run build


# ─── stage 2: runtime ──────────────────────────────────────────
FROM node:24-alpine

WORKDIR /app

COPY bot/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY bot/ ./

# Same origin as the API, so the SPA never needs a base URL at build time
COPY --from=web /web/dist ./public

ENV NODE_ENV=production
ENV PORT=3001
ENV DASHBOARD_DIST=/app/public
EXPOSE 3001

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
