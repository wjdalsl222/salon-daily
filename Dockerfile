FROM node:20-slim
WORKDIR /app

# better-sqlite3 네이티브 빌드용 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# 정산 데이터는 /app/data/salon.db 에 저장됨 (volume으로 보관)
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
