# Stage 1: Build the application
FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . ./app

WORKDIR /app

# Stage 2: Install dependencies and build the application
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile


FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm run generate
RUN pnpm run build
# Stage 3: Create the final image
FROM base

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY package.json tsconfig.json ./

EXPOSE 3000
ENV NODE_ENV=prod
CMD [ "pnpm", "start" ]
