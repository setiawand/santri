# Stage 1: Install semua dependency (termasuk kompilasi native module better-sqlite3)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Salin hasil build dan dependency
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Salin file DB schema & config untuk db:push dan db:seed saat pertama kali jalan
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./

# Direktori data SQLite (di-mount sebagai volume)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
