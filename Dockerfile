FROM node:20-alpine3.20 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run generate
RUN pnpm run build

FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/generated /app/generated
COPY prisma ./prisma
COPY package.json tsconfig.json ./
EXPOSE 3000
CMD [ "pnpm", "start" ]
