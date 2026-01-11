# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

# Prisma client generation is optional until code uses it,
# but keeping it here avoids surprises once Prisma is introduced.
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/generated ./generated

EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "src/server.ts"]

