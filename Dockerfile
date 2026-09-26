# Dockerfile สำหรับ bot — ใช้ได้กับ Render / Railway / Fly.io / VPS ทั่วไป
# build:  docker build -t botdash-bot .
# run:    docker run -p 3001:3001 -e DISCORD_TOKEN=... botdash-bot
FROM node:24-alpine

WORKDIR /app

# แยก layer ของ dependencies เพื่อให้ cache ได้
COPY bot/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY bot/ ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

USER node

CMD ["node", "src/index.js"]
